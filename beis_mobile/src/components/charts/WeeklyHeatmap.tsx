import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect } from "react-native-svg";


const SLOTS = ["morning", "afternoon", "evening", "night", "late_night"];
const SLOT_LABELS = ["Morn", "Aftn", "Eve", "Night", "Late"];

function intensity(val) {
 if (val <= 0) return "#1E293B";
 if (val < 0.15) return "#1E3A5F";
 if (val < 0.25) return "#1D4ED8";
 if (val < 0.35) return "#3B82F6";
 return "#60A5FA";
}

export default function WeeklyHeatmap({ data }) {
 const timeData = data || {};
 const cellW = 52; const cellH = 28; const gap = 3;

 return (
 <View style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600", marginBottom: 12 }}>Time Pattern</Text>
 <Svg width={SLOTS.length * (cellW + gap)} height={cellH + 20}>
 {SLOTS.map((slot, i) => (
 <React.Fragment key={slot}>
 <Rect x={i * (cellW + gap)} y={0} width={cellW} height={cellH}
 rx={6} fill={intensity(timeData[slot] || 0)} />
 <Rect x={i * (cellW + gap)} y={0} width={cellW} height={cellH}
 rx={6} fill="none" stroke="#334155" strokeWidth={0.5} />
 </React.Fragment>
 ))}
 </Svg>
 <View style={{ flexDirection: "row", marginTop: 8 }}>
 {SLOT_LABELS.map((label, i) => (
 <Text key={i} style={{ width: cellW + gap, color: "#64748B", fontSize: 14, textAlign: "center" }}>{label}</Text>
 ))}
 </View>
 </View>
 );
}
