import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import type { ThresholdResponse } from "@/types/api";

export function useThresholds() {
  return useQuery<ThresholdResponse>({
    queryKey: ["thresholds"],
    queryFn: async () => intelligenceClient.get("thresholds").json(),
    staleTime: 30 * 60 * 1000,
  });
}
