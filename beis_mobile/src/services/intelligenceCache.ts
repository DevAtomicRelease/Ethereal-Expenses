/**
 * Intelligence cache using AsyncStorage (4-hour TTL).
 * Fix 1: Replaced MMKV with AsyncStorage for Expo managed workflow.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IntelligenceResponse } from "@/types/api";

const CACHE_KEY = "beis_intelligence_cache";
const TS_KEY = "beis_intelligence_ts";
const TTL_MS = 4 * 60 * 60 * 1000;

export async function getCachedIntelligence(): Promise<IntelligenceResponse | null> {
  const tsStr = await AsyncStorage.getItem(TS_KEY);
  if (!tsStr || Date.now() - parseInt(tsStr, 10) > TTL_MS) return null;
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function cacheIntelligence(data: IntelligenceResponse): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  await AsyncStorage.setItem(TS_KEY, String(Date.now()));
}

export async function clearIntelligenceCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY, TS_KEY]);
}
