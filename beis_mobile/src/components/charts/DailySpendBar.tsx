import React from "react";
import { View, Text } from "react-native";
import { formatINR } from "@/utils/currency";
import ProgressBar from "@/components/ui/ProgressBar";


export default function DailySpendBar({ spent, threshold }) {
 const pct = threshold > 0 ? (spent / threshold) * 100 : 0;
 const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#3B82F6";
 return (
 <View>
 <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14 }}>Today: {formatINR(spent)}</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>/ {formatINR(threshold)}</Text>
 </View>
 <ProgressBar progress={pct} color={color} />
 </View>
 );
}
