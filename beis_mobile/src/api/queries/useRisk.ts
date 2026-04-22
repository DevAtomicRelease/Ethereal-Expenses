import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import type { RiskResponse } from "@/types/api";

export function useRisk() {
  return useQuery<RiskResponse>({
    queryKey: ["risk"],
    queryFn: async () => intelligenceClient.get("risk").json(),
    staleTime: 10 * 60 * 1000,
  });
}
