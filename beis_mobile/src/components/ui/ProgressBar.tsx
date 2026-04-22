import React from "react";
import { View } from "react-native";


export default function ProgressBar({ progress, color = "#3B82F6", height = 8 }: { progress: number; color?: string; height?: number }) {
 const clamped = Math.max(0, Math.min(100, progress));
 return (
 <View style={{ height, backgroundColor: "#334155", borderRadius: height / 2, overflow: "hidden" }}>
 <View style={{ height, width: `${clamped}%`, backgroundColor: color, borderRadius: height / 2 }} />
 </View>
 );
}
