/**
 * Recurring Expenses Screen — Auto-detected subscriptions & bills.
 */
import React from "react";
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useRecurring } from "@/api/queries/useRecurring";
import { formatINR } from "@/utils/currency";

const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
  success: "#A8D5A2",
} as const;

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

const FREQ_EMOJI: Record<string, string> = {
  weekly: "🔄", "bi-weekly": "📅", monthly: "📆",
  "bi-monthly": "🗓️", quarterly: "📋",
};

const CAT_EMOJI: Record<string, string> = {
  subscriptions: "📺", emi: "🏦", rent: "🏠", utilities: "💡",
  recharge: "📱", insurance: "🛡️", fitness: "💪", food: "🍕",
  transport: "🚗", education: "📚", entertainment: "🎮",
  health: "💊", fuel: "⛽", misc: "📦",
};

export default function RecurringScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useRecurring();

  const recurring = data?.recurring ?? [];
  const totalMonthly = data?.total_monthly ?? 0;
  const totalAnnual = data?.total_annual ?? 0;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Recurring Expenses</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>ESTIMATED MONTHLY RECURRING</Text>
          <Text style={s.summaryAmount}>{formatINR(totalMonthly)}</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryChip}>
              <Text style={s.summaryChipText}>{recurring.length} detected</Text>
            </View>
            <View style={s.summaryChip}>
              <Text style={s.summaryChipText}>{formatINR(totalAnnual)}/yr</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" />
        ) : error ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Unable to load</Text>
            <Text style={s.emptySub}>Pull down to retry</Text>
          </View>
        ) : recurring.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={s.emptyTitle}>No recurring expenses found</Text>
            <Text style={s.emptySub}>
              Keep tracking your expenses — we'll detect patterns automatically
              once you have enough transaction history.
            </Text>
          </View>
        ) : (
          <View style={s.listSection}>
            <Text style={s.sectionLabel}>DETECTED SUBSCRIPTIONS & BILLS</Text>
            {recurring.map((item: any, i: number) => (
              <View key={i} style={s.recurringCard}>
                <View style={s.recurringTop}>
                  <View style={s.recurringIconWrap}>
                    <Text style={{ fontSize: 22 }}>
                      {CAT_EMOJI[item.category] ?? "📦"}
                    </Text>
                  </View>
                  <View style={s.recurringInfo}>
                    <Text style={s.recurringName} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={s.recurringFreq}>
                      {FREQ_EMOJI[item.frequency] ?? "📅"}{" "}
                      {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                      {" · "}{item.occurrences} times
                    </Text>
                  </View>
                  <Text style={s.recurringAmount}>{formatINR(item.amount)}</Text>
                </View>
                <View style={s.recurringBottom}>
                  <View style={s.recurringMeta}>
                    <Text style={s.metaLabel}>Monthly</Text>
                    <Text style={s.metaValue}>{formatINR(item.monthly_cost)}</Text>
                  </View>
                  <View style={s.recurringMeta}>
                    <Text style={s.metaLabel}>Annual</Text>
                    <Text style={s.metaValue}>{formatINR(item.annual_cost)}</Text>
                  </View>
                  <View style={s.recurringMeta}>
                    <Text style={s.metaLabel}>Next</Text>
                    <Text style={s.metaValue}>
                      {new Date(item.next_expected).toLocaleDateString("en-IN", {
                        month: "short", day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: C.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },

  summaryCard: {
    marginHorizontal: 20, marginTop: 8, marginBottom: 20, borderRadius: 28,
    padding: 28, alignItems: "center",
    backgroundColor: C.primary + "10", borderWidth: 1, borderColor: C.primary + "25",
  },
  summaryLabel: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 2.5, marginBottom: 8 },
  summaryAmount: { color: C.onSurface, fontSize: 38, fontWeight: "900", letterSpacing: -2, marginBottom: 14 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.surfaceHighest + "88", borderWidth: 1, borderColor: C.outlineVar + "30",
  },
  summaryChipText: { color: C.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  listSection: { paddingHorizontal: 20 },
  sectionLabel: {
    color: C.primary, fontSize: 10, fontWeight: "800", letterSpacing: 2.5,
    marginBottom: 14,
  },

  recurringCard: {
    backgroundColor: C.surfaceHighest + "55", borderRadius: 20, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: C.outlineVar + "12",
  },
  recurringTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  recurringIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center",
  },
  recurringInfo: { flex: 1 },
  recurringName: { color: C.onSurface, fontSize: 15, fontWeight: "700" },
  recurringFreq: { color: C.onSurfaceVar, fontSize: 12, marginTop: 2 },
  recurringAmount: { color: C.onSurface, fontSize: 17, fontWeight: "800" },

  recurringBottom: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.outlineVar + "20",
    paddingTop: 12,
  },
  recurringMeta: { alignItems: "center" },
  metaLabel: { color: C.outline, fontSize: 10, fontWeight: "600", letterSpacing: 1, marginBottom: 3 },
  metaValue: { color: C.onSurface, fontSize: 13, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { color: C.onSurface, fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptySub: { color: C.onSurfaceVar, fontSize: 13, textAlign: "center", lineHeight: 20 },
});
