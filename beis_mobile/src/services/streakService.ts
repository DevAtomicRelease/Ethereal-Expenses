/**
 * streakService — AsyncStorage-backed spending streak tracker.
 *
 * A "streak day" = a day where the user's total spend was at or below
 * their daily threshold. If no expenses were logged on a day, it counts
 * as a streak day (you can't overspend if you don't spend).
 *
 * Persists: currentStreak, longestStreak, lastCheckedDate, badges[].
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "ethereal_spending_streak";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckedDate: string; // ISO date string (YYYY-MM-DD)
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: number; // streak days required
  unlockedAt: string | null; // ISO timestamp or null
}

const DEFAULT_BADGES: Badge[] = [
  { id: "first_day",  name: "First Step",     emoji: "🌱", description: "Complete 1 day under budget",     requirement: 1,  unlockedAt: null },
  { id: "three_day",  name: "Getting Going",  emoji: "⚡", description: "3-day streak under budget",       requirement: 3,  unlockedAt: null },
  { id: "one_week",   name: "Week Warrior",   emoji: "🔥", description: "7-day streak under budget",       requirement: 7,  unlockedAt: null },
  { id: "two_week",   name: "Steady Hand",    emoji: "💪", description: "14-day streak under budget",      requirement: 14, unlockedAt: null },
  { id: "one_month",  name: "Budget Master",  emoji: "🏆", description: "30-day streak under budget",      requirement: 30, unlockedAt: null },
  { id: "two_month",  name: "Iron Will",      emoji: "🛡️", description: "60-day streak under budget",      requirement: 60, unlockedAt: null },
  { id: "hundred",    name: "Legendary",      emoji: "👑", description: "100-day streak under budget",     requirement: 100, unlockedAt: null },
];

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCheckedDate: "",
  badges: DEFAULT_BADGES,
};

/** Load streak data from AsyncStorage */
export async function loadStreak(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StreakData;
      // Ensure any newly-added badges are present
      const existingIds = new Set(data.badges.map(b => b.id));
      for (const badge of DEFAULT_BADGES) {
        if (!existingIds.has(badge.id)) {
          data.badges.push(badge);
        }
      }
      return data;
    }
  } catch {}
  return { ...DEFAULT_STREAK, badges: DEFAULT_BADGES.map(b => ({ ...b })) };
}

/** Save streak data to AsyncStorage */
async function saveStreak(data: StreakData): Promise<void> {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * Update the streak based on today's spending.
 *
 * @param todaySpent - total spent today
 * @param dailyLimit - user's daily threshold
 * @returns updated StreakData
 */
export async function updateStreak(
  todaySpent: number,
  dailyLimit: number,
): Promise<StreakData> {
  const data = await loadStreak();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Already checked today? Don't double-count.
  if (data.lastCheckedDate === today) {
    return data;
  }

  // Check how many days passed since last check
  const lastDate = data.lastCheckedDate ? new Date(data.lastCheckedDate) : null;
  const todayDate = new Date(today);

  if (lastDate) {
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) {
      // Gap in checking — days with no data count as streak days (no spend = under budget)
      data.currentStreak += (daysDiff - 1);
    }
  }

  // Today's result
  const underBudget = dailyLimit <= 0 || todaySpent <= dailyLimit;
  if (underBudget) {
    data.currentStreak += 1;
  } else {
    data.currentStreak = 0; // streak broken
  }

  // Update longest
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  // Check for badge unlocks
  const now = new Date().toISOString();
  for (const badge of data.badges) {
    if (!badge.unlockedAt && data.currentStreak >= badge.requirement) {
      badge.unlockedAt = now;
    }
  }

  data.lastCheckedDate = today;
  await saveStreak(data);
  return data;
}

/** Reset streak (for testing or user request) */
export async function resetStreak(): Promise<StreakData> {
  const fresh = { ...DEFAULT_STREAK, badges: DEFAULT_BADGES.map(b => ({ ...b })) };
  await saveStreak(fresh);
  return fresh;
}
