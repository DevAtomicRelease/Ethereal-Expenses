import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/ui/Card";


export default function ShiftLog({ shiftDetected, shiftType, magnitude }) {
 if (!shiftDetected) return null;
 return (
 <Card>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>Behavioral Shift</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>
 {shiftType.replace(/_/g, " ")} detected — {magnitude.toFixed(1)}% change vs prior period
 </Text>
 </Card>
 );
}
