import { useQuery } from "@tanstack/react-query";
import { dataClient } from "../dataClient";

export function useRecurring() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: async () => dataClient.get("recurring").json<any>(),
    staleTime: 1000 * 60 * 10,
  });
}
