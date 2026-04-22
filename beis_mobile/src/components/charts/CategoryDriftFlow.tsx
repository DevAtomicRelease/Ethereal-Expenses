import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { getCategoryColor, getCategoryLabel } from "@/utils/categories";


export default function CategoryDriftFlow({ previous, current }) {
 const prev = previous || [];
 const curr = current || [];
 if (prev.length === 0 && curr.length === 0) {
 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20, height: 150, justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#64748B", fontSize: 14 }}>No category drift data</Text>
 </View>
 );
 }

 const W = 300; const H = Math.max(prev.length, curr.length) * 36 + 20;
 const nodeW = 90; const nodeH = 26;

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Category Drift</Text>
 <Svg width={W} height={H}>
 {/* Previous column */}
 {prev.map((cat, i) => {
 const y = 10 + i * 36;
 return (
 <React.Fragment key={`p-${cat}`}>
 <Rect x={10} y={y} width={nodeW} height={nodeH} rx={6} fill={getCategoryColor(cat)} opacity={0.8} />
 <SvgText x={10 + nodeW / 2} y={y + 17} fill="#FFF" fontSize={10} textAnchor="middle">
 {getCategoryLabel(cat).slice(0, 10)}
 </SvgText>
 </React.Fragment>
 );
 })}
 {/* Current column */}
 {curr.map((cat, i) => {
 const y = 10 + i * 36;
 return (
 <React.Fragment key={`c-${cat}`}>
 <Rect x={W - nodeW - 10} y={y} width={nodeW} height={nodeH} rx={6} fill={getCategoryColor(cat)} opacity={0.8} />
 <SvgText x={W - 10 - nodeW / 2} y={y + 17} fill="#FFF" fontSize={10} textAnchor="middle">
 {getCategoryLabel(cat).slice(0, 10)}
 </SvgText>
 </React.Fragment>
 );
 })}
 {/* Flow curves */}
 {prev.map((pCat, pi) => {
 const ci = curr.indexOf(pCat);
 const targetI = ci >= 0 ? ci : Math.min(pi, curr.length - 1);
 if (targetI < 0) return null;
 const sy = 10 + pi * 36 + nodeH / 2;
 const ey = 10 + targetI * 36 + nodeH / 2;
 const sx = 10 + nodeW;
 const ex = W - nodeW - 10;
 const mx = (sx + ex) / 2;
 return (
 <Path key={`f-${pCat}-${pi}`}
 d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`}
 fill="none" stroke={getCategoryColor(pCat)} strokeWidth={2} opacity={0.5} />
 );
 })}
 </Svg>
 </View>
 );
}
