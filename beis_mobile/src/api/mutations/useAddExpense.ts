import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import { isOnline } from "@/services/networkMonitor";
import { queueAdd } from "@/services/offlineQueue";
import type { ExpenseCreate, ExpenseResponse, ExpenseListResponse } from "@/types/api";

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation<ExpenseResponse, Error, ExpenseCreate>({
    mutationFn: async (expense) => {
      if (!isOnline()) {
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await queueAdd(expense, tempId);
        // Return a placeholder so the UI can show it immediately
        return {
          id: tempId,
          amount: typeof expense.amount === "number" ? expense.amount : parseFloat(String(expense.amount)),
          category: expense.category,
          description: expense.description || "",
          timestamp: expense.timestamp || new Date().toISOString(),
          source: "offline",
          anomaly_flag: false,
        } as ExpenseResponse;
      }

      return dataClient.post("expense", { json: expense }).json();
    },

    // Optimistic update: immediately add to the cache so user sees it
    onMutate: async (newExpense) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["expenses"] });

      // Snapshot the previous value
      const previousExpenses = qc.getQueriesData<ExpenseListResponse>({ queryKey: ["expenses"] });

      // Optimistically add the new expense to all expense query caches
      qc.setQueriesData<ExpenseListResponse>(
        { queryKey: ["expenses"] },
        (old) => {
          if (!old) return old;
          const optimistic: ExpenseResponse = {
            id: `optimistic_${Date.now()}`,
            amount: typeof newExpense.amount === "number" ? newExpense.amount : parseFloat(String(newExpense.amount)),
            category: newExpense.category,
            description: newExpense.description || "",
            timestamp: newExpense.timestamp || new Date().toISOString(),
            source: "manual",
            anomaly_flag: false,
          };
          return {
            ...old,
            transactions: [optimistic, ...old.transactions],
            total: old.total + 1,
          };
        }
      );

      return { previousExpenses };
    },

    // On error, roll back to the snapshot
    onError: (_err, _vars, context) => {
      if (context?.previousExpenses) {
        for (const [queryKey, data] of context.previousExpenses) {
          qc.setQueryData(queryKey, data);
        }
      }
    },

    // After mutation settles (success or error), refetch
    onSettled: () => {
      if (isOnline()) {
        qc.invalidateQueries({ queryKey: ["expenses"] });
        qc.invalidateQueries({ queryKey: ["intelligence"] });
        qc.invalidateQueries({ queryKey: ["insights"] });
        qc.invalidateQueries({ queryKey: ["risk"] });
        qc.invalidateQueries({ queryKey: ["momentum"] });
      }
    },
  });
}
