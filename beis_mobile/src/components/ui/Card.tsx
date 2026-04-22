import React from "react";
import { View, ViewStyle } from "react-native";


export default function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
 return (
 <View style={[{
 backgroundColor: "#1E293B", borderRadius: 12, padding: 20,
 marginHorizontal: 16, marginVertical: 8,
 }, style]}>
 {children}
 </View>
 );
}
