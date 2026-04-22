import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import type { AnomalyResponse } from "@/types/api";

export function useAnomalies() {
  return useQuery<AnomalyResponse>({
    queryKey: ["anomalies"],
    queryFn: async () => intelligenceClient.get("anomalies").json(),
    staleTime: 10 * 60 * 1000,
  });
}
