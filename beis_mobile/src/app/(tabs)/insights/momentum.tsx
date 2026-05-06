/**
 * Weekly Pulse — Spending momentum + Weekly Recap Stories.
 * Shows momentum direction/acceleration and swipeable weekly recap cards.
 */
import React, { useState, useMemo, useRef } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useMomentum } from "@/api/queries/useMomentum";
import { useQuery } from "@tanstack/react-query";
import { dataClient } from "@/api/dataClient";

const { width: SW } = Dimensions.get("window");

const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
  secondary: "#C0CAAF", green: "#4CAF50", yellow: "#FFD54F",
  red: "#FF7043", blue: "#64B5F6", purple: "#CE93D8", orange: "#FFB74D",
};

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Weekly recap helpers ───────────────────────────────────────────────────
function getWeekRange(weeksAgo: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
  endDate.setDate(endDate.getDate() + 6);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  if (weeksAgo === 0) return { start: startDate, end: endDate, label: "This Week" };
  if (weeksAgo === 1) return { start: startDate, end: endDate, label: "Last Week" };
  const startStr = `${startDate.getDate()} ${startDate.toLocaleDateString("en-IN", { month: "short" })}`;
  const endStr = `${endDate.getDate()} ${endDate.toLocaleDateString("en-IN", { month: "short" })}`;
  return { start: startDate, end: endDate, label: `${startStr} – ${endStr}` };
}

interface WeeklyRecap {
  label: string;
  total: number;
  txnCount: number;
  dailyAvg: number;
  topCategory: string;
  topCatAmount: number;
  activeDays: number;
  peakDay: string;
  peakDayAmount: number;
  vsLastWeek: number | null; // percentage change
  dailyBreakdown: { day: string; amount: number }[];
}

// ═════════════════════════════════════════════════════════════════════════════
export default function MomentumScreen() {
  const router = useRouter();
  const { data: momentumData, isLoading: momentumLoading } = useMomentum();
  const [activeSlide, setActiveSlide] = useState(0);

  // Fetch expenses
  const { data: expenseData } = useQuery({
    queryKey: ["expenses", "weekly-recap"],
    queryFn: async () => {
      const all: any[] = [];
      let page = 1;
      while (true) {
        const resp: any = await dataClient.get("expenses", {
          searchParams: { page: String(page), limit: "500" },
        }).json();
        const batch = resp.transactions || [];
        all.push(...batch);
        if (batch.length < 500 || all.length >= (resp.total || Infinity)) break;
        page++;
      }
      return all;
    },
    refetchOnMount: "always",
    staleTime: 1000 * 60 * 5,
  });

  const expenses = expenseData || [];

  // Build weekly recaps (last 4 weeks)
  const recaps: WeeklyRecap[] = useMemo(() => {
    const weeks: WeeklyRecap[] = [];
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let w = 0; w < 4; w++) {
      const { start, end, label } = getWeekRange(w);
      const weekExpenses = expenses.filter((e: any) => {
        const d = new Date(e.timestamp);
        return d >= start && d <= new Date(end.getTime() + 86400000);
      });

      const total = weekExpenses.reduce((s: number, e: any) => s + e.amount, 0);
      const txnCount = weekExpenses.length;

      // Category breakdown
      const catMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      for (const e of weekExpenses) {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        const dk = dateKey(new Date(e.timestamp));
        dailyMap[dk] = (dailyMap[dk] || 0) + e.amount;
      }

      let topCat = "—";
      let topCatAmt = 0;
      for (const [cat, amt] of Object.entries(catMap)) {
        if (amt > topCatAmt) { topCat = cat; topCatAmt = amt; }
      }

      // Peak day
      let peakDay = "—";
      let peakDayAmt = 0;
      for (const [dk, amt] of Object.entries(dailyMap)) {
        if (amt > peakDayAmt) {
          peakDay = new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
          peakDayAmt = amt;
        }
      }

      const activeDays = Object.keys(dailyMap).length;
      const dailyAvg = activeDays > 0 ? total / 7 : 0;

      // Daily breakdown for mini chart
      const dailyBreakdown = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dk = dateKey(d);
        dailyBreakdown.push({ day: DAYS[i], amount: dailyMap[dk] || 0 });
      }

      weeks.push({
        label, total, txnCount, dailyAvg,
        topCategory: topCat.replace(/_/g, " "),
        topCatAmount: topCatAmt, activeDays, peakDay,
        peakDayAmount: peakDayAmt, vsLastWeek: null,
        dailyBreakdown,
      });
    }

    // Calculate week-over-week change
    for (let i = 0; i < weeks.length - 1; i++) {
      const prev = weeks[i + 1].total;
      if (prev > 0) {
        weeks[i].vsLastWeek = ((weeks[i].total - prev) / prev) * 100;
      }
    }

    return weeks;
  }, [expenses]);

  const direction = momentumData?.direction ?? "stable";
  const acceleration = momentumData?.acceleration ?? 0;
  const isUp = direction === "accelerating" || direction === "accelerating_fast";
  const isDown = direction === "decelerating" || direction === "decelerating_fast";

  const maxDailyInRecap = recaps[activeSlide]
    ? Math.max(...recaps[activeSlide].dailyBreakdown.map(d => d.amount), 1)
    : 1;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Weekly Pulse</Text>
          <Text style={s.headerSub}>MOMENTUM & RECAPS</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Momentum Cards ── */}
        <View style={s.momentumRow}>
          <View style={s.momCard}>
            <Text style={s.momLabel}>DIRECTION</Text>
            <Text style={[s.momArrow, isUp && { color: C.error }, isDown && { color: C.green }]}>
              {isUp ? "↗" : isDown ? "↘" : "→"}
            </Text>
            <Text style={[s.momValue, isUp && { color: C.error }, isDown && { color: C.green }]}>
              {direction.replace(/_/g, " ")}
            </Text>
          </View>
          <View style={s.momCard}>
            <Text style={s.momLabel}>ACCELERATION</Text>
            <Text style={[s.momAccelVal, acceleration > 0 && { color: C.error }, acceleration < 0 && { color: C.green }]}>
              {acceleration >= 0 ? "+" : ""}{acceleration.toFixed(1)}%
            </Text>
            <Text style={s.momAccelDesc}>
              {acceleration > 0 ? "Speeding up" : acceleration < 0 ? "Slowing down" : "Holding steady"}
            </Text>
          </View>
        </View>

        {/* ── Weekly Recap Stories ── */}
        <Text style={s.sectionTitle}>WEEKLY RECAPS</Text>

        {recaps.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>Add some expenses to see your weekly recaps here.</Text>
          </View>
        ) : (
          <>
            {/* Story dots */}
            <View style={s.dotsRow}>
              {recaps.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.dot, i === activeSlide && s.dotActive]}
                  onPress={() => setActiveSlide(i)}
                >
                  <Text style={[s.dotText, i === activeSlide && s.dotTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Active recap card */}
            {recaps[activeSlide] && (() => {
              const r = recaps[activeSlide];
              return (
                <View style={s.recapCard}>
                  {/* Header */}
                  <View style={s.recapHeader}>
                    <Text style={s.recapTitle}>{r.label}</Text>
                    {r.vsLastWeek !== null && (
                      <View style={[s.changeBadge, r.vsLastWeek > 0 ? s.changeBadgeUp : s.changeBadgeDown]}>
                        <Text style={[s.changeText, r.vsLastWeek > 0 ? { color: C.red } : { color: C.green }]}>
                          {r.vsLastWeek > 0 ? "↑" : "↓"} {Math.abs(r.vsLastWeek).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Total */}
                  <Text style={s.recapTotal}>{formatCurrency(r.total)}</Text>
                  <Text style={s.recapTotalSub}>across {r.txnCount} transactions</Text>

                  {/* Mini bar chart */}
                  <View style={s.barChart}>
                    {r.dailyBreakdown.map((d, i) => (
                      <View key={i} style={s.barCol}>
                        <View style={s.barTrack}>
                          <View style={[
                            s.barFill,
                            {
                              height: `${Math.max((d.amount / maxDailyInRecap) * 100, 3)}%`,
                              backgroundColor: d.amount > r.dailyAvg ? C.orange : C.green,
                            },
                          ]} />
                        </View>
                        <Text style={s.barLabel}>{d.day}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Stats grid */}
                  <View style={s.recapStats}>
                    <View style={s.recapStatItem}>
                      <Text style={s.recapStatVal}>{formatCurrency(Math.round(r.dailyAvg))}</Text>
                      <Text style={s.recapStatLbl}>DAILY AVG</Text>
                    </View>
                    <View style={s.recapStatItem}>
                      <Text style={s.recapStatVal}>{r.activeDays}/7</Text>
                      <Text style={s.recapStatLbl}>ACTIVE DAYS</Text>
                    </View>
                    <View style={s.recapStatItem}>
                      <Text style={[s.recapStatVal, { textTransform: "capitalize" }]}>{r.topCategory}</Text>
                      <Text style={s.recapStatLbl}>TOP CATEGORY</Text>
                    </View>
                    <View style={s.recapStatItem}>
                      <Text style={s.recapStatVal}>{r.peakDay}</Text>
                      <Text style={s.recapStatLbl}>PEAK DAY</Text>
                    </View>
                  </View>

                  {/* Insight line */}
                  <View style={s.insightLine}>
                    <Text style={s.insightEmoji}>
                      {r.total === 0 ? "🎯" : r.vsLastWeek !== null && r.vsLastWeek < 0 ? "✨" : r.vsLastWeek !== null && r.vsLastWeek > 20 ? "⚠️" : "📊"}
                    </Text>
                    <Text style={s.insightText}>
                      {r.total === 0
                        ? "No spending recorded this week."
                        : r.vsLastWeek !== null && r.vsLastWeek < -10
                        ? `Great week! You spent ${Math.abs(r.vsLastWeek).toFixed(0)}% less than the week before.`
                        : r.vsLastWeek !== null && r.vsLastWeek > 20
                        ? `Spending jumped ${r.vsLastWeek.toFixed(0)}% — mostly on ${r.topCategory}.`
                        : `You averaged ${formatCurrency(Math.round(r.dailyAvg))}/day with peak spending on ${r.peakDay}.`}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {/* ── Info Card ── */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>About Weekly Pulse</Text>
          <Text style={s.infoText}>
            Momentum tracks the speed and direction of your spending changes.
            Weekly recaps give you a snapshot of each week — what you spent,
            where it went, and how it compares to the week before.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.outlineVar + "22" },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: C.primary, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { color: C.outline, fontSize: 9, fontWeight: "700", letterSpacing: 2.5, marginTop: 2 },

  // Momentum cards
  momentumRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginTop: 16 },
  momCard: { flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 20, alignItems: "center", borderWidth: 1, borderColor: C.outlineVar + "15" },
  momLabel: { color: C.outline, fontSize: 9, fontWeight: "700", letterSpacing: 2, marginBottom: 10 },
  momArrow: { fontSize: 32, color: C.primary, marginBottom: 4 },
  momValue: { color: C.onSurface, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  momAccelVal: { color: C.primary, fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 4 },
  momAccelDesc: { color: C.onSurfaceVar + "88", fontSize: 12, fontWeight: "600" },

  // Section
  sectionTitle: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 2.5, paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },

  // Dots (week tabs)
  dotsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 14 },
  dot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outlineVar + "15" },
  dotActive: { backgroundColor: C.primary + "1A", borderColor: C.primary + "44" },
  dotText: { color: C.outline, fontSize: 11, fontWeight: "600" },
  dotTextActive: { color: C.primary, fontWeight: "700" },

  // Recap card
  recapCard: { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.outlineVar + "15" },
  recapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  recapTitle: { color: C.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  changeBadgeUp: { backgroundColor: C.red + "15" },
  changeBadgeDown: { backgroundColor: C.green + "15" },
  changeText: { fontSize: 12, fontWeight: "700" },
  recapTotal: { color: C.primary, fontSize: 36, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  recapTotalSub: { color: C.onSurfaceVar + "77", fontSize: 12, fontWeight: "500", marginBottom: 20 },

  // Bar chart
  barChart: { flexDirection: "row", height: 80, gap: 4, marginBottom: 20 },
  barCol: { flex: 1, alignItems: "center" },
  barTrack: { flex: 1, width: "100%", backgroundColor: C.surfaceHighest, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { color: C.outline, fontSize: 9, fontWeight: "600", marginTop: 4, letterSpacing: 0.5 },

  // Stats grid
  recapStats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  recapStatItem: { width: (SW - 80) / 2, backgroundColor: C.surfaceHigh, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  recapStatVal: { color: C.onSurface, fontSize: 15, fontWeight: "800" },
  recapStatLbl: { color: C.outline, fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 3 },

  // Insight line
  insightLine: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.primary + "0A", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.primary + "15" },
  insightEmoji: { fontSize: 16, marginTop: 1 },
  insightText: { flex: 1, color: C.onSurfaceVar, fontSize: 13, lineHeight: 19 },

  // Empty
  emptyCard: { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16, padding: 24, alignItems: "center" },
  emptyText: { color: C.outline, fontSize: 13, textAlign: "center" },

  // Info
  infoCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: C.primary + "0D", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.primary + "1A" },
  infoTitle: { color: C.primary, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  infoText: { color: C.onSurfaceVar, fontSize: 13, lineHeight: 20 },
});
