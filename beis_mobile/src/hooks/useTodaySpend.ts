/**
 * useTodaySpend — computes today's total spending from the React Query cache.
 *
 * Returns:
 *  - todaySpent: total amount spent today
 *  - dailyLimit: the user's daily threshold (from adaptive threshold engine)
 *  - percentUsed: todaySpent / dailyLimit (0-1+ range)
 *  - isOverBudget: true if todaySpent > dailyLimit
 *  - isNearBudget: true if todaySpent > 80% of dailyLimit
 */
import { useMemo } from "react";
import { useExpenses } from "@/api/queries/useExpenses";
import { useThresholds } from "@/api/queries/useThresholds";

export function useTodaySpend() {
  const { data: expenseData } = useExpenses({ page: 1, limit: 500 });
  const { data: thresholds } = useThresholds();

  return useMemo(() => {
    const transactions = (expenseData as any)?.transactions ?? [];

    // Sum today's expenses
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySpent = transactions
      .filter((e: any) => new Date(e.timestamp) >= todayStart)
      .reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);

    const dailyLimit = thresholds?.daily ?? 0;
    const percentUsed = dailyLimit > 0 ? todaySpent / dailyLimit : 0;

    return {
      todaySpent,
      dailyLimit,
      percentUsed,
      isOverBudget: dailyLimit > 0 && todaySpent > dailyLimit,
      isNearBudget: dailyLimit > 0 && percentUsed >= 0.8,
    };
  }, [expenseData, thresholds]);
}
