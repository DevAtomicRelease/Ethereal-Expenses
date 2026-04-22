import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import type { ExpenseUpdate, ExpenseResponse } from "@/types/api";

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation<ExpenseResponse, Error, { id: string; data: ExpenseUpdate }>({
    mutationFn: async ({ id, data }) => dataClient.put(`expenses/${id}`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
    },
  });
}
