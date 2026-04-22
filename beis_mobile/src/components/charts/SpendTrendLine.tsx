import React from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Line, Circle, Text as SvgText } from "react-native-svg";


export default function SpendTrendLine({ data }) {
 const entries = data?.weekly_averages ? Object.entries(data.weekly_averages) : [];
 if (entries.length < 2) {
 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20, height: 150, justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#64748B", fontSize: 14 }}>Need 2+ weeks of data for trend</Text>
 </View>
 );
 }

 const values = entries.map(([, v]) => v);
 const maxVal = Math.max(...values, 1);
 const W = 320; const H = 140; const padX = 30; const padY = 10;
 const stepX = (W - padX * 2) / (values.length - 1);

 const points = values.map((v, i) => {
 const x = padX + i * stepX;
 const y = padY + (1 - v / maxVal) * (H - padY * 2);
 return { x, y, val: v };
 });
 const polyStr = points.map((p) => `${p.x},${p.y}`).join(" ");

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Weekly Spend Trend</Text>
 <Svg width={W} height={H}>
 {/* Grid lines */}
 {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
 const y = padY + pct * (H - padY * 2);
 return <Line key={pct} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#334155" strokeWidth={0.5} />;
 })}
 {/* Trend line */}
 <Polyline points={polyStr} fill="none" stroke="#3B82F6" strokeWidth={2.5} strokeLinejoin="round" />
 {/* Data points */}
 {points.map((p, i) => (
 <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#3B82F6" stroke="#0F172A" strokeWidth={1.5} />
 ))}
 {/* Y-axis labels */}
 <SvgText x={4} y={padY + 4} fill="#64748B" fontSize={9}>{(maxVal / 1000).toFixed(0)}k</SvgText>
 <SvgText x={4} y={H - padY + 4} fill="#64748B" fontSize={9}>0</SvgText>
 </Svg>
 </View>
 );
}
