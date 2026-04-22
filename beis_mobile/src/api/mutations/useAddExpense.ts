import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";
import { isOnline } from "@/services/networkMonitor";
import { queueTransaction } from "@/services/offlineQueue";
import type { ExpenseCreate, ExpenseResponse } from "@/types/api";

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation<ExpenseResponse, Error, ExpenseCreate>({
    mutationFn: async (expense) => {
      // If offline, queue the transaction for later sync
      if (!isOnline()) {
        await queueTransaction(expense);
        // Return a placeholder response so UI can proceed
        return {
          id: `offline_${Date.now()}`,
          amount: typeof expense.amount === "number" ? expense.amount : parseFloat(String(expense.amount)),
          category: expense.category,
          description: expense.description || "",
          timestamp: expense.timestamp || new Date().toISOString(),
          source: "manual",
          anomaly_flag: false,
        } as ExpenseResponse;
      }

      return dataClient.post("expense", { json: expense }).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
      qc.invalidateQueries({ queryKey: ["risk"] });
      qc.invalidateQueries({ queryKey: ["momentum"] });
    },
  });
}
