import { useQuery } from "@tanstack/react-query";
import { intelligenceClient } from "../intelligenceClient";
import type { IdentityResponse } from "@/types/api";

export function useIdentity() {
  return useQuery<IdentityResponse>({
    queryKey: ["identity"],
    queryFn: async () => intelligenceClient.get("identity").json(),
    staleTime: 30 * 60 * 1000,
  });
}
