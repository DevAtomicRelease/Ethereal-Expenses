/**
 * QuickAddFAB — Floating Action Button that navigates to the Add Expense screen.
 * The Add Expense screen will be designed and integrated separately.
 * This component is rendered inside screens that need a persistent FAB.
 */
import React from "react";
import { TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

export default function QuickAddFAB() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/expenses/add")}
      style={styles.fab}
      activeOpacity={0.85}
      accessibilityLabel="Add expense"
      accessibilityRole="button"
    >
      <Plus color="#1d1d00" size={28} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 120,
    right: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#CCC989",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: "#CCC989",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 24px rgba(204,201,137,0.4)" } as any,
    }),
  },
});
