import React from "react";
import Badge from "./Badge";


const COLORS= {
 insufficient: "#EF4444",
 early: "#F59E0B",
 developing: "#3B82F6",
 mature: "#10B981",
};

export default function ConfidenceBadge({ maturity, txnCount }: { maturity: string; txnCount: number }) {
 if (maturity === "mature") return null;
 const label = maturity === "early"
 ? `Building profile - ${txnCount} transactions`
 : maturity === "developing"
 ? `${txnCount} transactions - growing confidence`
 : `Need ${15 - txnCount} more transactions`;
 return <Badge label={label} color={COLORS[maturity as keyof typeof COLORS]} />;
}
