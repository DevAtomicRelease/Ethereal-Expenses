/**
 * Behavior detail screen (within Insights tab).
 * Wraps category breakdown so back-nav returns to AI Hub.
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
import { useInsights } from "@/api/queries/useInsights";
import { useIdentity } from "@/api/queries/useIdentity";

const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outlineVar: "#48473B",
};

const backArrow = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

export default function BehaviorScreen() {
  const router = useRouter();
  const { data: insights, isLoading } = useInsights();
  const { data: identity } = useIdentity();
  const breakdown = insights?.category_breakdown ?? {};
  const patterns = identity?.identity_traits ?? [];
  const archetype = identity?.primary_identity ?? "Unknown";

  const sortedCategories = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a);
  const total = sortedCategories.reduce((sum, [, v]) => sum + v, 0);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.title}>Behavior</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Archetype Card */}
            <View style={s.archetypeCard}>
              <Text style={s.archetypeLabel}>BEHAVIORAL ARCHETYPE</Text>
              <Text style={s.archetypeValue}>
                {archetype.replace(/_/g, " ")}
              </Text>
              {patterns.length > 0 && (
                <View style={s.patternRow}>
                  {patterns.map((p: string) => (
                    <View key={p} style={s.patternChip}>
                      <Text style={s.patternText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Category Breakdown */}
            <Text style={s.sectionLabel}>CATEGORY BREAKDOWN</Text>
            {sortedCategories.map(([cat, amount]) => {
              const pct = total > 0 ? (amount / total) * 100 : 0;
              return (
                <View key={cat} style={s.catRow}>
                  <View style={s.catInfo}>
                    <Text style={s.catName}>{cat.replace(/_/g, " ")}</Text>
                    <Text style={s.catAmount}>₹{amount.toLocaleString()}</Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${Math.max(pct, 2)}%` }]} />
                  </View>
                  <Text style={s.catPct}>{pct.toFixed(0)}%</Text>
                </View>
              );
            })}

            {sortedCategories.length === 0 && (
              <Text style={s.emptyText}>
                Add transactions to see your spending behavior breakdown.
              </Text>
            )}
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

  archetypeCard: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  archetypeLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  archetypeValue: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: 12,
  },
  patternRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patternChip: {
    backgroundColor: C.primary + "1A",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  patternText: { color: C.primary, fontSize: 12, fontWeight: "600" },

  sectionLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
  },
  catRow: {
    marginBottom: 16,
  },
  catInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  catName: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  catAmount: { color: C.onSurfaceVar, fontSize: 13, fontWeight: "500" },
  barBg: {
    height: 6,
    backgroundColor: C.surface,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  barFill: {
    height: 6,
    backgroundColor: C.primary,
    borderRadius: 3,
  },
  catPct: { color: C.onSurfaceVar + "99", fontSize: 11, fontWeight: "600" },
  emptyText: {
    color: C.onSurfaceVar,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});
