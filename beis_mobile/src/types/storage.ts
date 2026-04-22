/** AsyncStorage keys (non-sensitive data only). Tokens in SecureStore. */
export const STORAGE_KEYS = {
  INTELLIGENCE_CACHE: "beis_intelligence_cache",
  INTELLIGENCE_CACHE_TS: "beis_intelligence_cache_ts",
  PENDING_TRANSACTIONS: "beis_pending_txns",
  PREFERENCES: "beis_preferences",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
