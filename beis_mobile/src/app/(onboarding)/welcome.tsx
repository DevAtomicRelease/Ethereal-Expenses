import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Button from "@/components/ui/Button";

export default function WelcomeScreen() {
 const router = useRouter();
 return (
 <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A", justifyContent: "center", padding: 20 }}>
 <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>Welcome to BEIS</Text>
 <Text style={{ color: "#94A3B8", fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
 Your AI-powered behavioral spending intelligence system.{`\n\n`}
 Import a bank statement for instant insights, or add transactions manually.
 </Text>
 <Button title="Import Bank Statement" onPress={() => router.push("/(onboarding)/import-wizard")} />
 <View style={{ height: 12 }} />
 <Button title="Add Manually" variant="secondary" onPress={() => router.push("/(onboarding)/quick-add")} />
 <View style={{ height: 12 }} />
 <Button title="Skip for Now" variant="secondary" onPress={() => router.replace("/(tabs)/home")} />
 </SafeAreaView>
 );
}
