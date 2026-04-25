/**
 * Offline Operation Queue — AsyncStorage-backed queue for all mutation types.
 *
 * Queues add, update, and delete operations when offline.
 * Flushes them in order when connectivity is restored.
 * Each operation is idempotent-safe: deletes for already-deleted items are ignored.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dataClient } from "@/api/dataClient";
import type { ExpenseCreate, ExpenseUpdate } from "@/types/api";

const QUEUE_KEY = "atomicshift_offline_queue";

export type OfflineOperation =
  | { type: "add"; data: ExpenseCreate; tempId: string; createdAt: string }
  | { type: "update"; id: string; data: ExpenseUpdate; createdAt: string }
  | { type: "delete"; id: string; createdAt: string };

async function getQueue(): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: OfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Queue an add-expense operation for later sync. */
export async function queueAdd(data: ExpenseCreate, tempId: string): Promise<void> {
  const queue = await getQueue();
  queue.push({ type: "add", data, tempId, createdAt: new Date().toISOString() });
  await saveQueue(queue);
}

/** Queue an update-expense operation for later sync. */
export async function queueUpdate(id: string, data: ExpenseUpdate): Promise<void> {
  const queue = await getQueue();

  // If there's a pending add with this tempId, just update the data in place
  const existingAdd = queue.find((op) => op.type === "add" && op.tempId === id);
  if (existingAdd && existingAdd.type === "add") {
    existingAdd.data = { ...existingAdd.data, ...data };
    await saveQueue(queue);
    return;
  }

  queue.push({ type: "update", id, data, createdAt: new Date().toISOString() });
  await saveQueue(queue);
}

/** Queue a delete-expense operation for later sync. */
export async function queueDelete(id: string): Promise<void> {
  const queue = await getQueue();

  // If deleting a locally-added expense that hasn't synced yet, just remove the add
  const addIdx = queue.findIndex((op) => op.type === "add" && op.tempId === id);
  if (addIdx >= 0) {
    queue.splice(addIdx, 1);
    // Also remove any updates targeting this temp id
    const filtered = queue.filter((op) => !(op.type === "update" && op.id === id));
    await saveQueue(filtered);
    return;
  }

  // Remove any pending updates for this id (delete supersedes updates)
  const filtered = queue.filter((op) => !(op.type === "update" && op.id === id));
  filtered.push({ type: "delete", id, createdAt: new Date().toISOString() });
  await saveQueue(filtered);
}

/**
 * Flush all pending operations to the server.
 * Returns { synced, failed } counts.
 * Failed operations remain in the queue for next attempt.
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  const failed: OfflineOperation[] = [];

  for (const op of queue) {
    try {
      switch (op.type) {
        case "add":
          await dataClient.post("expense", { json: op.data }).json();
          synced++;
          break;
        case "update":
          // Skip updates for temp IDs (they don't exist on server)
          if (op.id.startsWith("offline_")) {
            // This shouldn't happen due to queueUpdate logic, but just in case
            failed.push(op);
          } else {
            await dataClient.put(`expenses/${op.id}`, { json: op.data }).json();
            synced++;
          }
          break;
        case "delete":
          // Skip deletes for temp IDs (they were never created on server)
          if (!op.id.startsWith("offline_")) {
            try {
              await dataClient.delete(`expenses/${op.id}`);
              synced++;
            } catch (e: any) {
              // 404 = already deleted, that's fine
              if (e?.response?.status === 404) {
                synced++;
              } else {
                throw e;
              }
            }
          } else {
            synced++; // temp ID, nothing to delete on server
          }
          break;
      }
    } catch {
      failed.push(op);
    }
  }

  await saveQueue(failed);
  return { synced, failed: failed.length };
}

/** Get count of pending operations. */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/** Clear the entire queue (e.g., on logout). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
