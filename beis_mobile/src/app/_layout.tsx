import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } },
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
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F172A" } }}>
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
