/**
 * Thresholds detail screen (within Insights tab).
 * Shows adaptive threshold data from GET /thresholds.
 * Back-nav returns to AI Hub.
 */
import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useThresholds } from "@/api/queries/useThresholds";

const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outlineVar: "#48473B",
};

const backArrow = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

export default function ThresholdsDetailScreen() {
  const router = useRouter();
  const { data, isLoading } = useThresholds();

  const items = [
    { label: "Daily Limit", value: data?.daily, period: "per day" },
    { label: "Weekly Limit", value: data?.weekly, period: "per week" },
    { label: "Monthly Limit", value: data?.monthly, period: "per month" },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.title}>Adaptive Thresholds</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {items.map((item) => (
              <View key={item.label} style={s.card}>
                <Text style={s.cardLabel}>{item.label}</Text>
                <Text style={s.cardValue}>
                  {item.value != null ? `₹${item.value.toLocaleString()}` : "Not set"}
                </Text>
                <Text style={s.cardPeriod}>{item.period}</Text>
              </View>
            ))}

            <View style={s.infoCard}>
              <Text style={s.infoTitle}>How it works</Text>
              <Text style={s.infoText}>
                Spending limits are calculated automatically based on your 
                spending history. They adjust over time as your habits change, helping you 
                stay within healthy spending limits.
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  backBtn: { padding: 4 },
  title: { color: C.onSurface, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20 },

  card: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  cardLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardValue: {
    color: C.onSurface,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardPeriod: {
    color: C.onSurfaceVar + "99",
    fontSize: 13,
  },

  infoCard: {
    backgroundColor: C.primary + "0D",
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.primary + "1A",
  },
  infoTitle: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 20,
  },
});
