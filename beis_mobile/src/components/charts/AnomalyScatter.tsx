import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";


const SEV_COLORS = { mild: "#F59E0B", moderate: "#F97316", severe: "#EF4444" };
const SEV_RADIUS: Record<string, number> = { mild: 4, moderate: 6, severe: 8 };

export default function AnomalyScatter({ anomalies }) {
 const items = anomalies || [];
 if (items.length === 0) {
 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20, height: 150, justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#64748B", fontSize: 14 }}>No anomalies detected</Text>
 </View>
 );
 }

 const W = 300; const H = 120; const pad = 20;
 const stepX = items.length > 1 ? (W - pad * 2) / (items.length - 1) : 0;

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
 Anomaly Events ({items.length})
 </Text>
 <Svg width={W} height={H}>
 <Line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#334155" strokeWidth={0.5} />
 {items.map((a, i) => {
 const x = pad + (items.length > 1 ? i * stepX : (W - pad * 2) / 2);
 const severity = a.severity || "mild";
 const r = SEV_RADIUS[severity] || 5;
 const color = SEV_COLORS[severity] || "#64748B";
 const y = H - pad - 10 - Math.random() * (H - pad * 2 - 30);
 return <Circle key={i} cx={x} cy={y} r={r} fill={color} opacity={0.8} />;
 })}
 </Svg>
 <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 }}>
 {(["mild", "moderate", "severe"]).map((s) => (
 <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
 <View style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: SEV_COLORS[s] }} />
 <Text style={{ color: "#64748B", fontSize: 14 }}>{s}</Text>
 </View>
 ))}
 </View>
 </View>
 );
}
