import React from "react";
import { SafeAreaView, Text, View } from "react-native";

export default function ImportScreen() {
 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#131313", justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>Bank Import</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>CSV import wizard — Phase 4</Text>
 </SafeAreaView>
 );
}
