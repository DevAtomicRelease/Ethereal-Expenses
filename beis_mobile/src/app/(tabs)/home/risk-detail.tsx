import React from "react";
import { ScrollView, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useRisk } from "@/api/queries/useRisk";

export default function RiskDetailScreen() {
 const { data } = useRisk();
 if (!data) return null;

 const r = data as any;
 const riskScore = r.risk_score ?? 0;
 const riskLevel = r.risk_level ?? "unknown";
 const riskFlags = r.risk_flags ?? {};
 const riskDrivers = r.risk_drivers ?? [];

 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#131313" }}>
 <ScrollView contentContainerStyle={{ padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 24, fontWeight: "700", marginBottom: 12 }}>Risk Breakdown</Text>
 <Card>
 <Text style={{ color: "#F8FAFC", fontSize: 32, fontWeight: "700" }}>{riskScore}</Text>
 <Badge label={riskLevel} color={riskLevel === "safe" ? "#10B981" : riskLevel === "danger" ? "#EF4444" : "#F59E0B"} />
 </Card>
 {Object.keys(riskFlags).length > 0 && (
 <Card style={{ marginTop: 8 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Risk Flags</Text>
 {Object.entries(riskFlags).map(([flag, active]) => (
 <View key={flag} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>{flag.replace(/_/g, " ")}</Text>
 <Text style={{ color: active ? "#EF4444" : "#10B981", fontWeight: "600" }}>{active ? "YES" : "NO"}</Text>
 </View>
 ))}
 </Card>
 )}
 {riskDrivers.length > 0 && (
 <Card style={{ marginTop: 8 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Drivers</Text>
 {riskDrivers.map((d: any) => (
 <Text key={String(d)} style={{ color: "#F59E0B", fontSize: 14, paddingVertical: 10 }}>• {String(d).replace(/_/g, " ")}</Text>
 ))}
 </Card>
 )}
 </ScrollView>
 </SafeAreaView>
 );
}
