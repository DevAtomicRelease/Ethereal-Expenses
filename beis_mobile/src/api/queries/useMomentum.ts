import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import type { MomentumResponse } from "@/types/api";

export function useMomentum() {
  return useQuery<MomentumResponse>({
    queryKey: ["momentum"],
    queryFn: async () => intelligenceClient.get("momentum").json(),
    staleTime: 10 * 60 * 1000,
  });
}
