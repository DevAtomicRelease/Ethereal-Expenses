/**
 * AsyncStorage adapter for redux-persist.
 * Fix 1: MMKV requires native modules, incompatible with Expo managed workflow.
 * AsyncStorage works in Expo Go without custom dev builds.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const asyncStoragePersist = AsyncStorage;
