import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";


export default function IdentityCard({ identity }) {
 return (
 <Card>
 <Badge label={identity.primary_identity.replace(/_/g, " ")} color="#3B82F6" />
 <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
 <View>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>Confidence</Text>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>{Math.round(identity.identity_confidence * 100)}%</Text>
 </View>
 <View>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>Self-Control</Text>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>{Math.round(identity.self_control_score * 100)}%</Text>
 </View>
 <View>
 <Text style={{ color: "#94A3B8", fontSize: 14 }}>Stability</Text>
 <Text style={{ color: identity.identity_stability === "stable" ? "#10B981" : "#F59E0B", fontSize: 14, fontWeight: "600", textTransform: "capitalize" }}>
 {identity.identity_stability}
 </Text>
 </View>
 </View>
 {identity.secondary_identities.length > 0 && (
 <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
 {identity.secondary_identities.map((s) => (
 <Badge key={s} label={s.replace(/_/g, " ")} color="#334155" />
 ))}
 </View>
 )}
 </Card>
 );
}
