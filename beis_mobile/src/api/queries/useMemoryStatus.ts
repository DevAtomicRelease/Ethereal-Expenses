import { useQuery } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import type { MemoryStatusResponse } from "@/types/api";

export function useMemoryStatus() {
  return useQuery<MemoryStatusResponse>({
    queryKey: ["memory_status"],
    queryFn: async () => dataClient.get("memory/status").json(),
    staleTime: 0,
  });
}
