import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import { isOnline } from "@/services/networkMonitor";
import { queueDelete } from "@/services/offlineQueue";
import type { ExpenseListResponse } from "@/types/api";

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isOnline()) {
        await queueDelete(id);
        return; // Queue for later, proceed with optimistic removal
      }
      await dataClient.delete(`expenses/${id}`);
    },

    // Optimistic update: immediately remove from cache
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });

      const previousExpenses = qc.getQueriesData<ExpenseListResponse>({ queryKey: ["expenses"] });

      qc.setQueriesData<ExpenseListResponse>(
        { queryKey: ["expenses"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.filter((t) => t.id !== deletedId),
            total: Math.max(0, old.total - 1),
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
