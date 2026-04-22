import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";


const SEV_COLORS: Record<string, string> = { mild: "#F59E0B", moderate: "#F97316", severe: "#EF4444" };

export default function AnomalyTimeline({ anomalies }: { anomalies: any[] }) {
 if (anomalies.length === 0) return null;
 return (
 <Card>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Anomalies ({anomalies.length})</Text>
 {anomalies.map((a, i) => (
 <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#334155" }}>
 <Badge label={a.severity} color={SEV_COLORS[a.severity]} />
 <Text style={{ color: "#94A3B8", fontSize: 14, marginLeft: 12, flex: 1 }}>
 {a.anomaly_type.replace(/_/g, " ")}
 </Text>
 </View>
 ))}
 </Card>
 );
}
