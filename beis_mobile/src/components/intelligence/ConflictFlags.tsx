import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Card from "@/components/ui/Card";


export default function ConflictFlags({ flags, details }) {
 const [expanded, setExpanded] = useState(false);
 if (flags.length === 0) return null;
 return (
 <Card>
 <TouchableOpacity onPress={() => setExpanded(!expanded)}>
 <Text style={{ color: "#F59E0B", fontSize: 14, fontWeight: "600" }}>
 {expanded ? "▼" : "▶"} {flags.length} Signal Contradiction{flags.length > 1 ? "s" : ""}
 </Text>
 </TouchableOpacity>
 {expanded && details.map((d, i) => (
 <View key={i} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#334155" }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>{d.conflict.replace(/_/g, " ")}</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>{d.hint}</Text>
 </View>
 ))}
 </Card>
 );
}
