import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";

export interface BenchmarkResponse {
  has_data: boolean;
  message?: string;
  total_users_in_pool?: number;
  your_30d_total?: number;
  community_avg_30d?: number;
  community_median_30d?: number;
  percentile?: number;
  vs_community_pct?: number;
  category_benchmarks?: Record<string, {
    your_spend: number;
    community_avg: number;
    diff_pct: number;
    status: "above" | "below" | "average";
  }>;
  your_txn_count?: number;
  community_avg_txn_count?: number;
  frequency_diff_pct?: number;
}

export function useBenchmarks() {
  return useQuery<BenchmarkResponse>({
    queryKey: ["benchmarks"],
    queryFn: async () => intelligenceClient.get("insights/benchmarks").json(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
