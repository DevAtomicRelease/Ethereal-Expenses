import { useMemoryStatus } from "@/api/queries/useMemoryStatus";

export function useDataMaturity() {
 const { data } = useMemoryStatus();
 const maturity = data?.data_maturity || "insufficient";
 const txnCount = data?.txn_count || 0;
 const isStale = data?.is_stale ?? true;

 return {
 maturity,
 txnCount,
 isStale,
 isMature: maturity === "mature",
 isEarly: maturity === "early",
 isInsufficient: maturity === "insufficient",
 progressPct: Math.min((txnCount / 150) * 100, 100),
 };
}
