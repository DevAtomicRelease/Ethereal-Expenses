import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";


export default function ProfileStrengthRing({ txnCount, target = 150 }) {
 const pct = Math.min(txnCount / target, 1);
 const radius = 40; const stroke = 6;
 const circ = 2 * Math.PI * radius;
 const progress = pct * circ;
 const color = pct >= 1 ? "#10B981" : pct >= 0.33 ? "#3B82F6" : "#F59E0B";

 return (
 <View style={{ alignItems: "center" }}>
 <Svg width={100} height={100}>
 <Circle cx={50} cy={50} r={radius} stroke="#334155" strokeWidth={stroke} fill="none" />
 <Circle cx={50} cy={50} r={radius} stroke={color} strokeWidth={stroke} fill="none"
 strokeDasharray={`${progress} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
 </Svg>
 <View style={{ position: "absolute", top: 32, alignItems: "center" }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700" }}>{txnCount}</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>/ {target}</Text>
 </View>
 </View>
 );
}
