import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import type { ExpenseCreate, BatchResult } from "@/types/api";

export function useBatchImport() {
  const qc = useQueryClient();
  return useMutation<BatchResult, Error, ExpenseCreate[]>({
    mutationFn: async (transactions) => dataClient.post("expenses/batch", { json: { transactions } }).json(),
    onSuccess: () => { qc.invalidateQueries(); },
  });
}
