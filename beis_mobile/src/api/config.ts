/**
 * API base URL — auto-detected from the Expo dev server (Expo SDK 51).
 *
 * Expo SDK 51 exposes the Metro bundler host via several possible paths on
 * Constants.  We probe all known locations so it works on physical devices,
 * Android emulators, and the web simultaneously.
 *
 * Fallback chain:
 *   1. Constants.expoConfig.hostUri           (Expo Go / dev-client, SDK 49+)
 *   2. Constants.manifest2.extra.expoGo.debuggerHost (older Expo Go)
 *   3. Constants.manifest.debuggerHost        (classic manifest, SDK < 46)
 *   4. Android emulator →  10.0.2.2
 *   5. iOS simulator   →  localhost
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = 8001;

function resolveBaseUrl(): string {
  // --- Priority 0: Explicit env var (most reliable, works everywhere) ---
  // Set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000 in a .env file.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    console.log("[API] base URL (EXPO_PUBLIC_API_URL):", envUrl);
    return envUrl;
  }

  // --- Web: use the browser's own hostname so no IP mismatch ---
  if (Platform.OS === "web") {
    const hostname =
      window.location.hostname === "localhost"
        ? "127.0.0.1"
        : window.location.hostname;
    const url = `http://${hostname}:${BACKEND_PORT}`;
    console.log("[API] base URL (web):", url);
    return url;
  }

  // --- Native: probe all known Expo Constants paths for the host IP ---
  // Expo SDK 49-51: hostUri is set when running via Expo Go or dev-client.
  const hostUri: string | undefined =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost ??
    undefined;

  if (hostUri) {
    const host = hostUri.split(":")[0]; // strip the Metro port
    const url = `http://${host}:${BACKEND_PORT}`;
    console.log("[API] base URL (auto, hostUri):", url);
    return url;
  }

  // --- Hard fallback ---
  if (Platform.OS === "android") {
    // 10.0.2.2 = Android emulator loopback → host machine.
    // On a PHYSICAL device set EXPO_PUBLIC_API_URL to your LAN IP instead.
    const url = `http://10.0.2.2:${BACKEND_PORT}`;
    console.log("[API] base URL (android emulator fallback):", url);
    return url;
  }

  const url = `http://localhost:${BACKEND_PORT}`;
  console.log("[API] base URL (localhost fallback):", url);
  return url;
}

export const API_BASE_URL = resolveBaseUrl();
