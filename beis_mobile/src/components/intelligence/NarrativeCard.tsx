import React from "react";
import { Text } from "react-native";
import Card from "@/components/ui/Card";


export default function NarrativeCard({ narrative }) {
 return (
 <Card>
 <Text style={{ color: "#F8FAFC", fontSize: 14, lineHeight: 22 }}>{narrative}</Text>
 </Card>
 );
}
