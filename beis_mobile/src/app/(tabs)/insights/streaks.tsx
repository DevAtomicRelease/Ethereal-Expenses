/**
 * Streaks & Challenges — Gamified spending habits tracker.
 * Tracks daily streaks, weekly challenges, and achievement badges.
 */
import React, { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Dimensions, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { dataClient } from "@/api/dataClient";

const { width: SW } = Dimensions.get("window");

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
  green: "#4CAF50", yellow: "#FFD54F", red: "#FF7043",
  purple: "#CE93D8", blue: "#64B5F6", orange: "#FFB74D",
} as const;

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const fireIcon = `<svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" fill="currentColor"/></svg>`;
const trophyIcon = `<svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill="currentColor"/></svg>`;
const starIcon = `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/></svg>`;
const shieldIcon = `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/></svg>`;
const targetIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" fill="currentColor"/></svg>`;

function mkIcon(xml: string, color: string, size: number) {
  return <SvgXml xml={xml.replace(/currentColor/g, color)} width={size} height={size} />;
}

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Challenge definitions ──────────────────────────────────────────────────
interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  type: "streak" | "limit" | "category" | "milestone";
  target: number;
  unit: string;
}

const CHALLENGES: Challenge[] = [
  { id: "no_spend_3", title: "No-Spend Sprint", description: "Go 3 days with zero spending", icon: shieldIcon, iconColor: C.green, type: "streak", target: 3, unit: "days" },
  { id: "under_500_5", title: "Budget Guardian", description: "Stay under ₹500/day for 5 days", icon: targetIcon, iconColor: C.blue, type: "limit", target: 5, unit: "days" },
  { id: "under_avg_7", title: "Below Average Week", description: "Spend below your daily average for 7 days", icon: starIcon, iconColor: C.yellow, type: "limit", target: 7, unit: "days" },
  { id: "no_dining_5", title: "Home Chef", description: "Skip dining out for 5 days straight", icon: trophyIcon, iconColor: C.orange, type: "category", target: 5, unit: "days" },
  { id: "streak_14", title: "Fortnight Focus", description: "Maintain a 14-day under-budget streak", icon: fireIcon, iconColor: "#FF9800", type: "streak", target: 14, unit: "days" },
  { id: "streak_30", title: "Monthly Master", description: "30-day streak of mindful spending", icon: fireIcon, iconColor: C.red, type: "streak", target: 30, unit: "days" },
  { id: "txn_50", title: "Tracker Veteran", description: "Log 50 total transactions", icon: starIcon, iconColor: C.purple, type: "milestone", target: 50, unit: "transactions" },
  { id: "txn_100", title: "Century Club", description: "Log 100 total transactions", icon: trophyIcon, iconColor: C.primary, type: "milestone", target: 100, unit: "transactions" },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function StreaksScreen() {
  const router = useRouter();
  const today = new Date();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  // Fetch all expenses
  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["expenses", "streaks"],
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

  // ── Compute all stats ──
  const stats = useMemo(() => {
    const dailyMap: Record<string, { total: number; categories: Set<string> }> = {};

    for (const e of expenses) {
      const d = new Date(e.timestamp);
      const key = dateKey(d);
      if (!dailyMap[key]) dailyMap[key] = { total: 0, categories: new Set() };
      dailyMap[key].total += e.amount;
      dailyMap[key].categories.add(e.category);
    }

    // Daily average
    const dailyTotals = Object.values(dailyMap).filter(d => d.total > 0).map(d => d.total);
    const dailyAvg = dailyTotals.length > 0
      ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length : 0;

    // Current streaks (looking backwards from today)
    let underBudgetStreak = 0;
    let noSpendStreak = 0;
    let under500Streak = 0;
    let noDiningStreak = 0;
    let underAvgStreak = 0;

    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const day = dailyMap[key];
      const dayTotal = day?.total || 0;

      if (i === 0 && !day) { underBudgetStreak++; noSpendStreak++; under500Streak++; noDiningStreak++; underAvgStreak++; continue; }

      // Under budget streak
      if (dayTotal <= dailyAvg || dayTotal === 0) { underBudgetStreak = i === underBudgetStreak ? underBudgetStreak + 1 : underBudgetStreak; }
      // No spend streak
      if (dayTotal === 0) { noSpendStreak = i === noSpendStreak ? noSpendStreak + 1 : noSpendStreak; }
      else if (noSpendStreak === i) { noSpendStreak = i; }
      // Under 500 streak
      if (dayTotal < 500) { under500Streak = i === under500Streak ? under500Streak + 1 : under500Streak; }
      // No dining streak
      if (!day?.categories.has("dining_out") && !day?.categories.has("dining out")) {
        noDiningStreak = i === noDiningStreak ? noDiningStreak + 1 : noDiningStreak;
      }
      // Under average streak
      if (dayTotal <= dailyAvg) { underAvgStreak = i === underAvgStreak ? underAvgStreak + 1 : underAvgStreak; }
    }

    // Best ever streak (under budget)
    let bestStreak = 0;
    let currentRun = 0;
    const sortedDays = Object.keys(dailyMap).sort();
    if (sortedDays.length > 0) {
      const firstDay = new Date(sortedDays[0]);
      const lastDay = new Date();
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const key = dateKey(d);
        const dayTotal = dailyMap[key]?.total || 0;
        if (dayTotal <= dailyAvg) { currentRun++; bestStreak = Math.max(bestStreak, currentRun); }
        else { currentRun = 0; }
      }
    }

    return {
      dailyAvg, underBudgetStreak, noSpendStreak, under500Streak,
      noDiningStreak, underAvgStreak, bestStreak, totalTxns: expenses.length,
    };
  }, [expenses]);

  // ── Challenge progress calculator ──
  function getChallengeProgress(ch: Challenge): { current: number; pct: number; done: boolean } {
    let current = 0;
    switch (ch.id) {
      case "no_spend_3": current = stats.noSpendStreak; break;
      case "under_500_5": current = stats.under500Streak; break;
      case "under_avg_7": current = stats.underAvgStreak; break;
      case "no_dining_5": current = stats.noDiningStreak; break;
      case "streak_14": case "streak_30": current = stats.underBudgetStreak; break;
      case "txn_50": case "txn_100": current = stats.totalTxns; break;
      default: current = 0;
    }
    const pct = Math.min(current / ch.target, 1);
    return { current, pct, done: current >= ch.target };
  }

  const completedCount = CHALLENGES.filter(c => getChallengeProgress(c).done).length;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          {mkIcon(backArrow, C.primary, 22)}
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Streaks & Challenges</Text>
          <Text style={s.headerSub}>GAMIFIED HABITS</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Hero Streak Card ── */}
        <View style={s.heroCard}>
          <View style={s.heroFireWrap}>
            {mkIcon(fireIcon, "#FF9800", 40)}
          </View>
          <Text style={s.heroNumber}>{stats.underBudgetStreak}</Text>
          <Text style={s.heroLabel}>DAY STREAK</Text>
          <Text style={s.heroDesc}>Consecutive days under your daily average</Text>
          <View style={s.heroStatsRow}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatVal}>{stats.bestStreak}</Text>
              <Text style={s.heroStatLbl}>BEST EVER</Text>
            </View>
            <View style={[s.heroStatItem, { borderLeftWidth: 1, borderLeftColor: C.outlineVar + "33" }]}>
              <Text style={s.heroStatVal}>{formatCurrency(Math.round(stats.dailyAvg))}</Text>
              <Text style={s.heroStatLbl}>DAILY AVG</Text>
            </View>
            <View style={[s.heroStatItem, { borderLeftWidth: 1, borderLeftColor: C.outlineVar + "33" }]}>
              <Text style={s.heroStatVal}>{completedCount}/{CHALLENGES.length}</Text>
              <Text style={s.heroStatLbl}>COMPLETED</Text>
            </View>
          </View>
        </View>

        {/* ── Active Challenges ── */}
        <Text style={s.sectionTitle}>ACTIVE CHALLENGES</Text>
        {CHALLENGES.filter(c => !getChallengeProgress(c).done).map(ch => {
          const { current, pct } = getChallengeProgress(ch);
          return (
            <TouchableOpacity
              key={ch.id} style={s.challengeCard} activeOpacity={0.85}
              onPress={() => setSelectedChallenge(ch)}
            >
              <View style={[s.challengeIcon, { backgroundColor: ch.iconColor + "1A" }]}>
                {mkIcon(ch.icon, ch.iconColor, 22)}
              </View>
              <View style={s.challengeContent}>
                <Text style={s.challengeName}>{ch.title}</Text>
                <Text style={s.challengeDesc}>{ch.description}</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: ch.iconColor }]} />
                </View>
                <Text style={s.progressText}>
                  {current} / {ch.target} {ch.unit}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Completed ── */}
        {completedCount > 0 && (
          <>
            <Text style={s.sectionTitle}>COMPLETED 🎉</Text>
            {CHALLENGES.filter(c => getChallengeProgress(c).done).map(ch => (
              <View key={ch.id} style={[s.challengeCard, s.completedCard]}>
                <View style={[s.challengeIcon, { backgroundColor: C.green + "1A" }]}>
                  {mkIcon(ch.icon, C.green, 22)}
                </View>
                <View style={s.challengeContent}>
                  <Text style={[s.challengeName, { color: C.green }]}>{ch.title}</Text>
                  <Text style={s.challengeDesc}>{ch.description}</Text>
                  <View style={[s.progressTrack, { backgroundColor: C.green + "33" }]}>
                    <View style={[s.progressFill, { width: "100%", backgroundColor: C.green }]} />
                  </View>
                  <Text style={[s.progressText, { color: C.green }]}>Completed ✓</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Quick Stats ── */}
        <Text style={s.sectionTitle}>STREAK BREAKDOWN</Text>
        <View style={s.quickGrid}>
          {[
            { label: "No-Spend", val: `${stats.noSpendStreak}d`, color: C.green },
            { label: "Under ₹500", val: `${stats.under500Streak}d`, color: C.blue },
            { label: "Below Avg", val: `${stats.underAvgStreak}d`, color: C.yellow },
            { label: "No Dining", val: `${stats.noDiningStreak}d`, color: C.orange },
          ].map((item) => (
            <View key={item.label} style={s.quickCard}>
              <Text style={[s.quickVal, { color: item.color }]}>{item.val}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Challenge Detail Modal ── */}
      <Modal visible={!!selectedChallenge} transparent animationType="slide" onRequestClose={() => setSelectedChallenge(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {selectedChallenge && (() => {
              const { current, pct } = getChallengeProgress(selectedChallenge);
              return (
                <>
                  <View style={s.modalTop}>
                    <View style={[s.modalIconWrap, { backgroundColor: selectedChallenge.iconColor + "1A" }]}>
                      {mkIcon(selectedChallenge.icon, selectedChallenge.iconColor, 32)}
                    </View>
                    <TouchableOpacity onPress={() => setSelectedChallenge(null)} style={s.modalCloseBtn}>
                      <Text style={{ color: C.onSurface, fontSize: 20 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.modalTitle}>{selectedChallenge.title}</Text>
                  <Text style={s.modalDesc}>{selectedChallenge.description}</Text>
                  <View style={s.modalProgressWrap}>
                    <View style={s.modalProgressTrack}>
                      <View style={[s.modalProgressFill, { width: `${pct * 100}%`, backgroundColor: selectedChallenge.iconColor }]} />
                    </View>
                    <Text style={s.modalProgressText}>{Math.round(pct * 100)}%</Text>
                  </View>
                  <View style={s.modalStatsRow}>
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: selectedChallenge.iconColor }]}>{current}</Text>
                      <Text style={s.modalStatLbl}>CURRENT</Text>
                    </View>
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: C.onSurface }]}>{selectedChallenge.target}</Text>
                      <Text style={s.modalStatLbl}>TARGET</Text>
                    </View>
                    <View style={s.modalStatItem}>
                      <Text style={[s.modalStatVal, { color: C.onSurface }]}>{Math.max(0, selectedChallenge.target - current)}</Text>
                      <Text style={s.modalStatLbl}>REMAINING</Text>
                    </View>
                  </View>
                  <Text style={s.modalTip}>
                    {pct >= 1 ? "🎉 Challenge complete! Great discipline."
                      : pct >= 0.5 ? "💪 Over halfway there — keep going!"
                      : "🚀 Every day counts. Stay consistent!"}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
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

  // Hero
  heroCard: { margin: 16, backgroundColor: C.surface, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: C.outlineVar + "15" },
  heroFireWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FF980015", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroNumber: { color: "#FF9800", fontSize: 56, fontWeight: "900", letterSpacing: -2 },
  heroLabel: { color: C.outline, fontSize: 11, fontWeight: "700", letterSpacing: 3, marginTop: 4 },
  heroDesc: { color: C.onSurfaceVar + "88", fontSize: 13, marginTop: 8, textAlign: "center" },
  heroStatsRow: { flexDirection: "row", marginTop: 20, width: "100%" },
  heroStatItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  heroStatVal: { color: C.primary, fontSize: 16, fontWeight: "800" },
  heroStatLbl: { color: C.outline, fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },

  // Section
  sectionTitle: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 2.5, paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },

  // Challenge cards
  challengeCard: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.outlineVar + "15", alignItems: "flex-start", gap: 14 },
  completedCard: { opacity: 0.7, borderColor: C.green + "30" },
  challengeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  challengeContent: { flex: 1 },
  challengeName: { color: C.onSurface, fontSize: 15, fontWeight: "700" },
  challengeDesc: { color: C.onSurfaceVar + "88", fontSize: 12, marginTop: 3 },
  progressTrack: { height: 6, backgroundColor: C.surfaceHighest, borderRadius: 3, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { color: C.outline, fontSize: 11, fontWeight: "600", marginTop: 4 },

  // Quick stats grid
  quickGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  quickCard: { width: (SW - 40) / 2, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 18, alignItems: "center", borderWidth: 1, borderColor: C.outlineVar + "15" },
  quickVal: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  quickLabel: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalCloseBtn: { padding: 4, backgroundColor: C.surfaceHighest, borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { color: C.onSurface, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  modalDesc: { color: C.onSurfaceVar + "99", fontSize: 14, marginTop: 6 },
  modalProgressWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  modalProgressTrack: { flex: 1, height: 10, backgroundColor: C.surfaceHighest, borderRadius: 5, overflow: "hidden" },
  modalProgressFill: { height: "100%", borderRadius: 5 },
  modalProgressText: { color: C.onSurface, fontSize: 16, fontWeight: "800", width: 44, textAlign: "right" },
  modalStatsRow: { flexDirection: "row", marginTop: 20, gap: 8 },
  modalStatItem: { flex: 1, backgroundColor: C.surfaceHigh, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalStatVal: { fontSize: 22, fontWeight: "800" },
  modalStatLbl: { color: C.outline, fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 4 },
  modalTip: { color: C.onSurfaceVar, fontSize: 14, marginTop: 20, textAlign: "center", fontWeight: "500" },
});
