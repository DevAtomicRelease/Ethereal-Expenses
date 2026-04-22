/**
 * Network monitor. Auto-flushes offline queue on reconnect.
 */
import NetInfo from "@react-native-community/netinfo";
import { flushQueue } from "./offlineQueue";

type Listener = (isOnline: boolean) => void;
const listeners: Listener[] = [];
let currentState = true;

export function initNetworkMonitor(): void {
  NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    const wasOffline = !currentState;
    currentState = online;
    listeners.forEach((l) => l(online));
    if (online && wasOffline) flushQueue().catch(() => {});
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
