import React from "react";
import { View, Text } from "react-native";


export default function Badge({ label, color = "#3B82F6", textColor = "#FFF" }: { label: string; color?: string; textColor?: string }) {
 return (
 <View style={{
 backgroundColor: color, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
 alignSelf: "flex-start",
 }}>
 <Text style={{ color: textColor, fontSize: 12, fontWeight: "600" }}>{label}</Text>
 </View>
 );
}
