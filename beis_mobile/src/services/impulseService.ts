/**
 * impulseService — AsyncStorage-backed impulse purchase log.
 *
 * Users log intended purchases BEFORE buying. After a configurable delay
 * (default 15 min), a notification asks "Did you buy it?". If not, the
 * app celebrates the saved money.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleDelayedNotification } from "./notifications";

const IMPULSE_KEY = "ethereal_impulse_log";

export interface ImpulseItem {
  id: string;
  name: string;
  estimatedCost: number;
  category: string;
  mood?: string;
  createdAt: string;       // ISO timestamp
  status: "pending" | "bought" | "resisted";
  resolvedAt?: string;     // ISO timestamp when marked bought/resisted
}

export interface ImpulseStats {
  totalLogged: number;
  totalResisted: number;
  totalBought: number;
  totalSaved: number; // sum of estimatedCost for resisted items
}

/** Load all impulse items from AsyncStorage */
export async function loadImpulseItems(): Promise<ImpulseItem[]> {
  try {
    const raw = await AsyncStorage.getItem(IMPULSE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveImpulseItems(items: ImpulseItem[]): Promise<void> {
  await AsyncStorage.setItem(IMPULSE_KEY, JSON.stringify(items));
}

/**
 * Add a new impulse item and schedule a follow-up notification.
 * @param name     - Item description
 * @param cost     - Estimated cost
 * @param category - Spending category
 * @param mood     - Current mood
 * @param delayMinutes - Cooling-off period (default 15 min)
 */
export async function addImpulseItem(
  name: string,
  cost: number,
  category: string,
  mood?: string,
  delayMinutes: number = 15,
): Promise<ImpulseItem> {
  const items = await loadImpulseItems();
  const newItem: ImpulseItem = {
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    estimatedCost: cost,
    category,
    mood,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  items.unshift(newItem); // newest first
  await saveImpulseItems(items);

  // Schedule follow-up notification
  await scheduleDelayedNotification(
    "🤔 Did you buy it?",
    `You logged "${name}" (₹${cost.toLocaleString("en-IN")}) ${delayMinutes} minutes ago. Still want it?`,
    delayMinutes * 60,
  );

  return newItem;
}

/** Mark an impulse item as bought (they went through with it) */
export async function markBought(id: string): Promise<void> {
  const items = await loadImpulseItems();
  const item = items.find(i => i.id === id);
  if (item) {
    item.status = "bought";
    item.resolvedAt = new Date().toISOString();
    await saveImpulseItems(items);
  }
}

/** Mark an impulse item as resisted (they didn't buy it!) */
export async function markResisted(id: string): Promise<void> {
  const items = await loadImpulseItems();
  const item = items.find(i => i.id === id);
  if (item) {
    item.status = "resisted";
    item.resolvedAt = new Date().toISOString();
    await saveImpulseItems(items);
  }
}

/** Delete an impulse item */
export async function deleteImpulseItem(id: string): Promise<void> {
  const items = await loadImpulseItems();
  const filtered = items.filter(i => i.id !== id);
  await saveImpulseItems(filtered);
}

/** Compute impulse stats */
export async function getImpulseStats(): Promise<ImpulseStats> {
  const items = await loadImpulseItems();
  const resisted = items.filter(i => i.status === "resisted");
  return {
    totalLogged: items.length,
    totalResisted: resisted.length,
    totalBought: items.filter(i => i.status === "bought").length,
    totalSaved: resisted.reduce((sum, i) => sum + i.estimatedCost, 0),
  };
}

/** Clear all impulse items (for testing) */
export async function clearImpulseLog(): Promise<void> {
  await AsyncStorage.removeItem(IMPULSE_KEY);
}
