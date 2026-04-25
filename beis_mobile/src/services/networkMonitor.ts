/**
 * Network monitor. Auto-flushes offline queue on reconnect
 * and invalidates all React Query caches to sync fresh data.
 */
import NetInfo from "@react-native-community/netinfo";
import { flushQueue } from "./offlineQueue";

type Listener = (isOnline: boolean) => void;
const listeners: Listener[] = [];
let currentState = true;
// Callback to be set by _layout.tsx for query invalidation on reconnect
let onReconnectCallback: (() => void) | null = null;

export function setOnReconnect(cb: () => void): void {
  onReconnectCallback = cb;
}

export function initNetworkMonitor(): void {
  NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    const wasOffline = !currentState;
    currentState = online;
    listeners.forEach((l) => l(online));

    // On reconnect: flush offline queue, then refresh all data
    if (online && wasOffline) {
      flushQueue()
        .then(({ synced }) => {
          if (synced > 0) {
            console.log(`[SYNC] Flushed ${synced} offline operations`);
          }
          // Trigger query invalidation to reload fresh server data
          if (onReconnectCallback) onReconnectCallback();
        })
        .catch((err) => {
          console.error("[SYNC] Queue flush failed:", err);
        });
    }
  });
}

export function isOnline(): boolean { return currentState; }

export function onNetworkChange(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
