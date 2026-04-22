import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from "react-native";

type ButtonProps = {
 title: string;
 onPress: () => void;
 variant?: "primary" | "secondary" | "danger";
 loading?: boolean;
 disabled?: boolean;
 style?: ViewStyle;
};

const COLORS: Record<string, { bg: string; text: string }> = {
 primary: { bg: "#3B82F6", text: "#FFF" },
 secondary: { bg: "#334155", text: "#F8FAFC" },
 danger: { bg: "#EF4444", text: "#FFF" },
};

export default function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style }: ButtonProps) {
 const c = COLORS[variant];
 return (
 <TouchableOpacity
 onPress={onPress}
 disabled={disabled || loading}
 style={[{
 backgroundColor: disabled ? "#475569" : c.bg,
 paddingVertical: 12, paddingHorizontal: 20,
 borderRadius: 12, alignItems: "center",
 opacity: disabled ? 0.5 : 1,
 }, style]}
 >
 {loading ? (
 <ActivityIndicator color={c.text} />
 ) : (
 <Text style={{ color: c.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
 )}
 </TouchableOpacity>
 );
}
