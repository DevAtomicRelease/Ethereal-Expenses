import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";

export function useSplits(settled?: boolean) {
  return useQuery({
    queryKey: ["splits", settled],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (settled !== undefined) params.settled = String(settled);
      return dataClient.get("splits", { searchParams: params }).json<any>();
    },
    staleTime: 1000 * 60 * 2,
    refetchOnMount: "always",
  });
}

export function useCreateSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      total_amount: number;
      your_share: number;
      category?: string;
      record_transaction?: boolean;
      participants: { name: string; share: number }[];
    }) => dataClient.post("splits", { json: body }).json<any>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["splits"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useSettleSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ splitId, name }: { splitId: string; name: string }) =>
      dataClient.put(`splits/${splitId}/settle`, { json: { name } }).json<any>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["splits"] }),
  });
}

export function useDeleteSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (splitId: string) =>
      dataClient.delete(`splits/${splitId}`).json<any>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["splits"] }),
  });
}
