import { useQuery } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import type { ExpenseListResponse, Category } from "@/types/api";

interface ExpenseFilters { page?: number; limit?: number; category?: Category; }

export function useExpenses(filters: ExpenseFilters = {}) {
  const { page = 1, limit = 20, category } = filters;
  return useQuery<ExpenseListResponse>({
    queryKey: ["expenses", page, limit, category],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (category) params.category = category;
      return dataClient.get("expenses", { searchParams: params }).json();
    },
    // Always fetch fresh data when the screen mounts (critical for post-login)
    refetchOnMount: "always",
    // Short stale time so data refreshes frequently
    staleTime: 1000 * 60 * 2,
  });
}
