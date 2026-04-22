import React from "react";
import { SafeAreaView, Text } from "react-native";
import SpendTrendLine from "@/components/charts/SpendTrendLine";
import { useInsights } from "@/api/queries/useInsights";

export default function TrendScreen() {
 const { data } = useInsights();
 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A", padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>Spend Trend</Text>
 <SpendTrendLine data={data} />
 </SafeAreaView>
 );
}
