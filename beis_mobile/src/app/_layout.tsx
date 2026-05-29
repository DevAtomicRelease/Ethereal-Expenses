import React, { useEffect, useRef } from "react";
import { LogBox, Platform, AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider, useQueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { store, persistor } from "@/store/store";
import { wsClient } from "@/api/websocket";
import { initNetworkMonitor, setOnReconnect } from "@/services/networkMonitor";
import { intelligenceClient } from "@/api/intelligenceClient";
import {
  registerForPushNotifications,
  notifyHighRisk,
  notifyAnomalyDetected,
  notifyOverBudgetForecast,
} from "@/services/notifications";

LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

if (Platform.OS === 'web') {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        if (args.length > 0 && typeof args[0] === 'string') {
            if (
                args[0].includes('props.pointerEvents is deprecated') ||
                args[0].includes('"shadow*" style props are deprecated') ||
                args[0].includes('Animated: `useNativeDriver`')
            ) {
                return;
            }
        }
        originalWarn(...args);
    };
}

// ─── React Query ↔ Network integration ──────────────────────────────────────
// Tell React Query about real device connectivity so it pauses queries
// when offline and auto-retries when back online (critical for Render cold starts).
onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
        setOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
});

// Tell React Query when the app comes back to foreground → refetch stale queries.
// Without this, a user reopening the app after Render wakes up sees stale empty data.
if (Platform.OS !== "web") {
    const subscription = AppState.addEventListener("change", (status) => {
        focusManager.setFocused(status === "active");
    });
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Retry with exponential backoff: 1s → 4s → 16s → 30s
            // Render free tier cold starts take ~30-60s, so we need patience.
            retry: 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
            staleTime: 1000 * 60 * 5,
            // Keep cache in memory for 24 hours (for offline persistence)
            gcTime: 1000 * 60 * 60 * 24,
            // Auto-refetch when network reconnects (Render wakes up)
            refetchOnReconnect: "always",
            // Auto-refetch when app comes back to foreground
            refetchOnWindowFocus: "always",
        },
    },
});

// ─── Persist React Query cache to AsyncStorage ──────────────────────────────
// This means when the app opens offline, it can show the last-known data
// instead of a blank screen.
const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "atomicshift_query_cache",
    // Serialize/deserialize controls
    throttleTime: 2000, // Don't write to storage more than once per 2s
});

/**
 * Inner component that has access to Redux + QueryClient.
 * Handles WebSocket connection and network monitoring.
 */
function AppShell() {
    const isAuthenticated = useSelector((s: any) => s.auth?.isAuthenticated);
    const qc = useQueryClient();
    const notificationsRegistered = useRef(false);

    // Initialize network monitor + register reconnect handler
    useEffect(() => {
        initNetworkMonitor();
        // When the device reconnects, flush offline queue then reload all data
        setOnReconnect(() => {
            qc.invalidateQueries();
        });
    }, [qc]);

    // Register for push notifications once on mount
    useEffect(() => {
        if (!notificationsRegistered.current) {
            notificationsRegistered.current = true;
            registerForPushNotifications().catch(() => {});
        }
    }, []);

    // Connect/disconnect WebSocket based on auth state
    useEffect(() => {
        if (isAuthenticated) {
            wsClient.connect();

            // Invalidate stale queries when intelligence pipeline completes
            wsClient.on("intelligence_ready", () => {
                qc.invalidateQueries({ queryKey: ["intelligence"] });
                qc.invalidateQueries({ queryKey: ["insights"] });
                qc.invalidateQueries({ queryKey: ["risk"] });
                qc.invalidateQueries({ queryKey: ["momentum"] });
                qc.invalidateQueries({ queryKey: ["identity"] });
                qc.invalidateQueries({ queryKey: ["anomalies"] });

                // ── Behavioral notifications ─────────────────────────
                // Fetch fresh risk + anomaly data and fire local alerts.
                // Wrapped in try/catch so a failed fetch never crashes the WS handler.
                (async () => {
                    try {
                        const [riskData, anomalyData, momentumData, thresholdData] = await Promise.all([
                            intelligenceClient.get("risk").json<any>(),
                            intelligenceClient.get("anomalies").json<any>(),
                            intelligenceClient.get("momentum").json<any>(),
                            intelligenceClient.get("thresholds").json<any>(),
                        ]);

                        // High risk alert (score ≥ 70)
                        if (riskData?.risk_score >= 70) {
                            notifyHighRisk(riskData.risk_score, riskData.risk_level);
                        }

                        // Anomaly alert
                        if (anomalyData?.anomalies_detected && anomalyData.anomaly_count > 0) {
                            notifyAnomalyDetected(anomalyData.anomaly_count);
                        }

                        // Over-budget forecast alert
                        if (
                            momentumData?.projection_30d > 0 &&
                            thresholdData?.monthly > 0 &&
                            momentumData.projection_30d > thresholdData.monthly * 1.1
                        ) {
                            notifyOverBudgetForecast(momentumData.projection_30d, thresholdData.monthly);
                        }
                    } catch {
                        // Silently ignore — notifications are best-effort
                    }
                })();
            });

            // Refresh expense list when new expenses arrive
            wsClient.on("expense_created", () => {
                qc.invalidateQueries({ queryKey: ["expenses"] });
            });
            wsClient.on("expense_updated", () => {
                qc.invalidateQueries({ queryKey: ["expenses"] });
            });
            wsClient.on("expense_deleted", () => {
                qc.invalidateQueries({ queryKey: ["expenses"] });
            });
            wsClient.on("batch_imported", () => {
                qc.invalidateQueries({ queryKey: ["expenses"] });
            });

            return () => {
                wsClient.disconnect();
            };
        }
    }, [isAuthenticated, qc]);

    return (
        <>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131313" } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(onboarding)" />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }}
                >
                    <AppShell />
                </PersistQueryClientProvider>
            </PersistGate>
        </Provider>
    );
}
