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
 primary: { bg: "#CCC989", text: "#333202" },
 secondary: { bg: "#353534", text: "#E5E2E1" },
 danger: { bg: "#93000A", text: "#FFB4AB" },
};

export default function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style }: ButtonProps) {
 const c = COLORS[variant];
 return (
 <TouchableOpacity
 onPress={onPress}
 disabled={disabled || loading}
 style={[{
  backgroundColor: disabled ? "#48473B" : c.bg,
  paddingVertical: 16, paddingHorizontal: 24,
  borderRadius: 16, alignItems: "center",
  opacity: disabled ? 0.5 : 1,
 }, style]}
 activeOpacity={0.85}
 >
 {loading ? (
  <ActivityIndicator color={c.text} />
 ) : (
  <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>{title}</Text>
 )}
 </TouchableOpacity>
 );
}
