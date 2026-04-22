import { useMemo } from "react";

export function useCategoryChartData(insights) {
 return useMemo(() => {
 if (!insights?.category_breakdown) return [];
 return Object.entries(insights.category_breakdown)
 .map(([name, value]) => ({ name, value: Math.round(value * 100) }))
 .sort((a, b) => b.value - a.value)
 .slice(0, 8);
 }, [insights]);
}

export function useTimePatternData(insights) {
 return useMemo(() => {
 if (!insights?.time_pattern) return [];
 return Object.entries(insights.time_pattern).map(([slot, pct]) => ({
 slot,
 pct: Math.round(pct * 100),
 }));
 }, [insights]);
}
