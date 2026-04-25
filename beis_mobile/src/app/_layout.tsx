import React, { useEffect } from "react";
import { LogBox, Platform, AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider, useQueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { store, persistor } from "@/store/store";
import { wsClient } from "@/api/websocket";
import { initNetworkMonitor } from "@/services/networkMonitor";

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
            // Auto-refetch when network reconnects (Render wakes up)
            refetchOnReconnect: "always",
            // Auto-refetch when app comes back to foreground
            refetchOnWindowFocus: "always",
        },
    },
});

/**
 * Inner component that has access to Redux + QueryClient.
 * Handles WebSocket connection and network monitoring.
 */
function AppShell() {
    const isAuthenticated = useSelector((s: any) => s.auth?.isAuthenticated);
    const qc = useQueryClient();

    // Initialize network monitor once on app mount
    useEffect(() => {
        initNetworkMonitor();
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
                <QueryClientProvider client={queryClient}>
                    <AppShell />
                </QueryClientProvider>
            </PersistGate>
        </Provider>
    );
}

