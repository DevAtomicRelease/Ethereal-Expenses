import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { formatINR } from "@/utils/currency";


export default function MonthlyBarCompare({ data }) {
 const months = data || [];
 if (months.length === 0) {
 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20, height: 150, justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#64748B", fontSize: 14 }}>No monthly data yet</Text>
 </View>
 );
 }

 const W = 300; const H = 140; const pad = 25;
 const maxVal = Math.max(...months.map((m) => m.total), 1);
 const barW = Math.min(40, (W - pad * 2) / months.length - 8);

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Monthly Comparison</Text>
 <Svg width={W} height={H}>
 {months.map((m, i) => {
 const barH = (m.total / maxVal) * (H - pad * 2);
 const x = pad + i * ((W - pad * 2) / months.length) + 4;
 const y = H - pad - barH;
 const color = i === months.length - 1 ? "#3B82F6" : "#475569";
 return (
 <React.Fragment key={i}>
 <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} />
 <SvgText x={x + barW / 2} y={H - 6} fill="#64748B" fontSize={9} textAnchor="middle">
 {m.month.slice(-2)}
 </SvgText>
 </React.Fragment>
 );
 })}
 </Svg>
 </View>
 );
}
