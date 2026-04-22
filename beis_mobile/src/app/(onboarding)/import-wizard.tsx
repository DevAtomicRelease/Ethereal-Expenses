import React from "react";
import { SafeAreaView, Text } from "react-native";

export default function ImportWizardScreen() {
 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>Import Wizard</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>CSV column mapping — Phase 4</Text>
 </SafeAreaView>
 );
}
