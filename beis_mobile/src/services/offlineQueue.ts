/**
 * Offline transaction queue using AsyncStorage.
 * Fix 1: Replaced MMKV with AsyncStorage for Expo managed workflow.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dataClient } from "@/api/dataClient";
import type { ExpenseCreate } from "@/types/api";

const QUEUE_KEY = "beis_pending_txns";

export async function queueTransaction(txn: ExpenseCreate): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: ExpenseCreate[] = raw ? JSON.parse(raw) : [];
  queue.push(txn);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;
  const queue: ExpenseCreate[] = JSON.parse(raw);
  if (queue.length === 0) return 0;
  let flushed = 0;
  const failed: ExpenseCreate[] = [];
  for (const txn of queue) {
    try {
      await dataClient.post("expense", { json: txn }).json();
      flushed++;
    } catch {
      failed.push(txn);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return flushed;
}

export async function getPendingCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).length : 0;
}
