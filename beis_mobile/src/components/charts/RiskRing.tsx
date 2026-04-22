import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";


const COLORS: Record<string, string> = { safe: "#10B981", watch: "#F59E0B", concern: "#F97316", danger: "#EF4444" };

export default function RiskRing({ score, level }: { score: number; level: string }) {
 const color = COLORS[level] || "#64748B";
 const radius = 60;
 const stroke = 10;
 const circ = 2 * Math.PI * radius;
 const progress = (score / 100) * circ;

 return (
 <View style={{ alignItems: "center" }}>
 <Svg width={160} height={160}>
 <Circle cx={80} cy={80} r={radius} stroke="#334155" strokeWidth={stroke} fill="none" />
 <Circle cx={80} cy={80} r={radius} stroke={color} strokeWidth={stroke} fill="none"
 strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
 transform="rotate(-90 80 80)" />
 </Svg>
 <View style={{ position: "absolute", top: 50, alignItems: "center" }}>
 <Text style={{ color: "#F8FAFC", fontSize: 32, fontWeight: "700" }}>{score}</Text>
 <Text style={{ color, fontSize: 14, fontWeight: "600", textTransform: "capitalize" }}>{level}</Text>
 </View>
 </View>
 );
}
