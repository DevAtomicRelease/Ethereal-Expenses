import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import { isOnline } from "@/services/networkMonitor";
import { queueUpdate } from "@/services/offlineQueue";
import type { ExpenseUpdate, ExpenseResponse, ExpenseListResponse } from "@/types/api";

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation<ExpenseResponse, Error, { id: string; data: ExpenseUpdate }>({
    mutationFn: async ({ id, data }) => {
      if (!isOnline()) {
        await queueUpdate(id, data);
        // Return merged placeholder
        return { id, ...data } as ExpenseResponse;
      }
      return dataClient.put(`expenses/${id}`, { json: data }).json();
    },

    // Optimistic update: immediately apply changes in cache
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });

      const previousExpenses = qc.getQueriesData<ExpenseListResponse>({ queryKey: ["expenses"] });

      qc.setQueriesData<ExpenseListResponse>(
        { queryKey: ["expenses"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.map((t) =>
              t.id === id ? { ...t, ...data } : t
            ),
          };
        }
      );

      return { previousExpenses };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousExpenses) {
        for (const [queryKey, data] of context.previousExpenses) {
          qc.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      if (isOnline()) {
        qc.invalidateQueries({ queryKey: ["expenses"] });
        qc.invalidateQueries({ queryKey: ["intelligence"] });
      }
    },
  });
}
