import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "../dataClient";

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await dataClient.delete(`expenses/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
    },
  });
}
