import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { getCategoryColor, getCategoryLabel } from "@/utils/categories";


function polarToCart(cx, cy, r, angle) {
 const rad = ((angle - 90) * Math.PI) / 180;
 return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, start, end) {
 const s = polarToCart(cx, cy, r, start);
 const e = polarToCart(cx, cy, r, end);
 const large = end - start > 180 ? 1 : 0;
 return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function CategoryDonut({ data }) {
 if (!data || Object.keys(data).length === 0) {
 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20, height: 150, justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#64748B", fontSize: 14 }}>No category data yet</Text>
 </View>
 );
 }

 const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
 const total = entries.reduce((s, [, v]) => s + v, 0);
 const cx = 100; const cy = 100; const r = 70; const sw = 20;
 let cumAngle = 0;

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Categories</Text>
 <View style={{ flexDirection: "row", alignItems: "center" }}>
 <Svg width={200} height={200}>
 {entries.map(([cat, val]) => {
 const sweep = total > 0 ? (val / total) * 360 : 0;
 if (sweep < 1) { cumAngle += sweep; return null; }
 const path = arcPath(cx, cy, r, cumAngle, cumAngle + sweep - 1);
 cumAngle += sweep;
 return <Path key={cat} d={path} fill="none" stroke={getCategoryColor(cat)} strokeWidth={sw} strokeLinecap="round" />;
 })}
 </Svg>
 <View style={{ flex: 1, marginLeft: 12 }}>
 {entries.map(([cat, val]) => (
 <View key={cat} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
 <View style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: getCategoryColor(cat), marginRight: 8 }} />
 <Text style={{ color: "#94A3B8", fontSize: 14, flex: 1 }}>{getCategoryLabel(cat)}</Text>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>{Math.round(val * 100)}%</Text>
 </View>
 ))}
 </View>
 </View>
 </View>
 );
}
