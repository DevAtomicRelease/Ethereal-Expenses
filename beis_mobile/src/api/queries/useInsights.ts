import { useQuery } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import type { InsightResponse } from "@/types/api";

export function useInsights() {
  return useQuery<InsightResponse>({
    queryKey: ["insights"],
    queryFn: async () => dataClient.get("insights").json(),
    staleTime: 15 * 60 * 1000,
  });
}
