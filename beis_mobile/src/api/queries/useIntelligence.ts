import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import { getCachedIntelligence, cacheIntelligence } from "@/services/intelligenceCache";
import type { IntelligenceResponse, InsufficientDataResponse } from "@/types/api";

export function useIntelligence() {
  return useQuery<IntelligenceResponse | InsufficientDataResponse>({
    queryKey: ["intelligence"],
    queryFn: async () => {
      // Check local cache first (4-hour TTL) to avoid redundant API calls
      const cached = await getCachedIntelligence();
      if (cached) return cached;

      // Fetch fresh data from backend
      const fresh = await intelligenceClient.get("intelligence").json<IntelligenceResponse | InsufficientDataResponse>();

      // Cache if it's a full intelligence response (not insufficient_data)
      if (fresh && "narrative" in fresh && fresh.narrative) {
        await cacheIntelligence(fresh as IntelligenceResponse);
      }

      return fresh;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnMount: "always",
  });
}
