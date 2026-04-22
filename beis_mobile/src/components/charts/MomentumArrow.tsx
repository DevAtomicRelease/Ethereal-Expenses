import React from "react";
import { View, Text } from "react-native";
import Svg, { Polygon, Line } from "react-native-svg";


const DIR_ANGLES: Record<string, number> = {
 accelerating_fast: -60, accelerating: -30, stable: 0,
 decelerating: 30, decelerating_fast: 60,
};
const DIR_COLORS= {
 accelerating_fast: "#EF4444", accelerating: "#F59E0B", stable: "#3B82F6",
 decelerating: "#10B981", decelerating_fast: "#059669",
};

export default function MomentumArrow({ direction, acceleration }) {
 const angle = DIR_ANGLES[direction] ?? 0;
 const color = DIR_COLORS[direction] ?? "#64748B";
 const label = direction.replace(/_/g, " ");

 return (
 <View style={{ alignItems: "center" }}>
 <Svg width={80} height={80} viewBox="0 0 80 80">
 <Line x1={40} y1={60} x2={40} y2={20} stroke={color} strokeWidth={4}
 strokeLinecap="round" transform={`rotate(${angle} 40 40)`} />
 <Polygon points="30,25 40,10 50,25" fill={color}
 transform={`rotate(${angle} 40 40)`} />
 </Svg>
 <Text style={{ color, fontSize: 14, fontWeight: "600", textTransform: "capitalize", marginTop: 8 }}>
 {label}
 </Text>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>
 {acceleration > 0 ? "+" : ""}{(acceleration * 100).toFixed(0)}%
 </Text>
 </View>
 );
}
