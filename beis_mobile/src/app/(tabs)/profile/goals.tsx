/**
 * Spending Goals Screen — Category-based budget tracking.
 *
 * Layout (from HTML mockup):
 *  1. Header: ← back + "Vault Goals"
 *  2. Summary: Monthly budget vs spent (big number + progress bar + remaining card)
 *  3. "Set New Goal" CTA
 *  4. Active Goals grid: per-category cards with progress bars
 *  5. Insights panel: spending trend + projected savings + daily cap
 *
 * Backend data:
 *  - useThresholds()  → daily / weekly / monthly limits + per_category budgets
 *  - useExpenses()    → actual spend list (summed by category)
 *  - useInsights()    → category_breakdown, weekly_averages, insight messages
 */
import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useThresholds } from "@/api/queries/useThresholds";
import { useExpenses } from "@/api/queries/useExpenses";
import { useInsights } from "@/api/queries/useInsights";
import { CATEGORIES, getCategoryLabel } from "@/utils/categories";
import { formatINR } from "@/utils/currency";
import { useQueryClient } from "@tanstack/react-query";
import { dataClient } from "@/api/dataClient";

const closeIcon = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>`;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  primaryDim: "#969359",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#939182",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  errorContainer: "#93000A",
  secondary: "#C0CAAF",
  secondaryContainer: "#434C37",
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const addCircle = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/></svg>`;

// Category → icon SVG mapping (subset for display)
const CAT_ICONS: Record<string, string> = {
  food: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  transport: `<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor"/></svg>`,
  entertainment: `<svg viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="currentColor"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" fill="currentColor"/></svg>`,
  utilities: `<svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" fill="currentColor"/></svg>`,
  health: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
  groceries: `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020.01 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
  rent: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>`,
  education: `<svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="currentColor"/></svg>`,
};

// Fallback icon
const defaultCatIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/></svg>`;

function getCatIcon(cat: string): string {
  return CAT_ICONS[cat] || defaultCatIcon;
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(pct, 100),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View style={gs.barTrack}>
      <Animated.View
        style={[
          gs.barFill,
          {
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
          pct > 85 && {
            ...Platform.select({
              ios: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 },
              android: { elevation: 4 },
            }),
          },
        ]}
      />
    </View>
  );
}

const gs = StyleSheet.create({
  barTrack: { height: 6, backgroundColor: C.surfaceHighest, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
});

// ═══════════════════════════════════════════════════════════════════════════════
export default function SpendingGoalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: thresholds } = useThresholds();
  const { data: expenseData } = useExpenses({ page: 1, limit: 200 });
  const { data: insightData } = useInsights();

  // ── Set New Goal modal state ──────────────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Compute totals ─────────────────────────────────────────────────────────
  const expenses = useMemo(() => {
    return (expenseData as any)?.expenses ?? (expenseData as any)?.transactions ?? [];
  }, [expenseData]);

  const totalSpent = useMemo(() => expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0), [expenses]);

  const monthlyBudget = thresholds?.monthly ?? 35000;
  const dailyCap = thresholds?.daily ?? 2000;
  const remaining = Math.max(monthlyBudget - totalSpent, 0);
  const overallPct = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0;

  // ── Per-category spending ──────────────────────────────────────────────────
  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || "misc";
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return map;
  }, [expenses]);

  // Per-category budgets from thresholds or from insights category_breakdown
  const perCategoryBudget: Record<string, number> = (thresholds as any)?.per_category ?? {};

  // Build goal card data
  const goalCards = useMemo(() => {
    // Merge categories from spend + budget
    const cats = new Set([...Object.keys(categorySpend), ...Object.keys(perCategoryBudget)]);
    const items: Array<{
      key: string;
      label: string;
      spent: number;
      budget: number;
      pct: number;
    }> = [];
    cats.forEach((cat) => {
      const spent = categorySpend[cat] || 0;
      const budget = perCategoryBudget[cat] || 0;
      if (spent === 0 && budget === 0) return;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0);
      items.push({ key: cat, label: getCategoryLabel(cat), spent, budget, pct });
    });
    // Sort: highest usage first
    items.sort((a, b) => b.pct - a.pct);
    return items;
  }, [categorySpend, perCategoryBudget]);

  // ── Insights data ──────────────────────────────────────────────────────────
  // insightData is a flat object { category_breakdown, weekly_averages, time_pattern, ... }
  // There is no .insights array — generate a message from spending data instead
  const topCategory = Object.entries((insightData as any)?.category_breakdown ?? {})
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];
  const firstInsightMessage = topCategory
    ? `Top category: ${topCategory[0].replace(/_/g, " ")} (${Math.round((topCategory[1] as number) * 100)}% of spending).`
    : null;
  const weeklyAvg = (insightData as any)?.weekly_averages;
  const projectedSavings = remaining;

  // ── Current month label ────────────────────────────────────────────────────
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Available categories (exclude already budgeted) ─────────────────────
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter((c: any) => {
      const val = typeof c === "string" ? c : c.value;
      return !perCategoryBudget[val];
    });
  }, [perCategoryBudget]);

  const handleSetGoal = () => {
    setSelectedCat(null);
    setBudgetInput("");
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedCat || !budgetInput) return;
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid budget amount.");
      return;
    }
    setSaving(true);
    try {
      const updatedPerCategory = { ...perCategoryBudget, [selectedCat]: amount };
      await dataClient.put("thresholds", {
        json: {
          daily: thresholds?.daily ?? 2000,
          weekly: thresholds?.weekly ?? 10000,
          monthly: thresholds?.monthly ?? 35000,
          per_category: updatedPerCategory,
        },
      }).json();
      queryClient.invalidateQueries({ queryKey: ["thresholds"] });
      setShowGoalModal(false);
      Alert.alert("Goal Created", `${getCategoryLabel(selectedCat)} budget set to ${formatINR(amount)}/month.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Vault Goals</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Summary Section ──────────────────────────────── */}
        <View style={s.summarySection}>
          <Text style={s.cycleLabel}>CURRENT MONTHLY CYCLE</Text>
          <View style={s.bigNumberRow}>
            <Text style={s.bigSpent}>{formatINR(totalSpent)}</Text>
            <Text style={s.bigBudget}> / {formatINR(monthlyBudget)}</Text>
          </View>
          {/* Overall progress */}
          <View style={s.overallBarWrap}>
            <AnimatedBar pct={overallPct} color={overallPct > 85 ? C.error : C.primary} />
          </View>
        </View>

        {/* ── Remaining + Set Goal ─────────────────────────── */}
        <View style={s.actionsRow}>
          <View style={s.remainingCard}>
            <Text style={s.remainingLabel}>REMAINING TO SPEND</Text>
            <Text style={s.remainingValue}>{formatINR(remaining)}</Text>
          </View>
          <TouchableOpacity style={s.setGoalBtn} activeOpacity={0.85} onPress={handleSetGoal}>
            <SvgXml xml={addCircle.replace(/currentColor/g, C.onPrimary)} width={20} height={20} />
            <Text style={s.setGoalText}>Set New Goal</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Goals ─────────────────────────────────── */}
        <View style={s.goalsSection}>
          <View style={s.goalsSectionHeader}>
            <Text style={s.goalsSectionTitle}>Active Goals</Text>
            <View style={s.monthBadge}>
              <Text style={s.monthBadgeText}>{monthLabel.toUpperCase()}</Text>
            </View>
          </View>

          {goalCards.length > 0 ? (
            <View style={s.goalsGrid}>
              {goalCards.map((goal) => {
                const isCritical = goal.pct >= 85;
                const isUntouched = goal.spent === 0;
                const barColor = isCritical ? C.error : C.primary;
                return (
                  <View key={goal.key} style={s.goalCard}>
                    <View style={s.goalCardTop}>
                      <View style={s.goalIconWrap}>
                        <SvgXml
                          xml={getCatIcon(goal.key).replace(/currentColor/g, C.primary)}
                          width={22}
                          height={22}
                        />
                      </View>
                      <Text style={[s.goalPct, isCritical && { color: C.error }]}>
                        {isUntouched ? "Untouched" : `${Math.min(goal.pct, 999)}% used`}
                      </Text>
                    </View>
                    <View style={s.goalCardBottom}>
                      <Text style={s.goalName}>{goal.label}</Text>
                      <Text style={s.goalAmounts}>
                        {formatINR(goal.spent)}
                        {goal.budget > 0 ? ` of ${formatINR(goal.budget)}` : ""}
                      </Text>
                      {goal.budget > 0 && (
                        <View style={{ marginTop: 10 }}>
                          <AnimatedBar pct={goal.pct} color={barColor} />
                        </View>
                      )}
                      {goal.budget === 0 && (
                        <View style={s.noBudgetBadge}>
                          <Text style={s.noBudgetText}>NO LIMIT SET</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>
                No spending data yet. Add transactions to see your goals here.
              </Text>
            </View>
          )}
        </View>

        {/* ── Insights Panel ───────────────────────────────── */}
        <View style={s.insightPanel}>
          {/* Ambient glow */}
          <View style={s.insightGlow} />

          <View style={s.insightContent}>
            <View style={s.insightLeft}>
              <Text style={s.insightHeadline}>
                {firstInsightMessage
                  ? firstInsightMessage
                  : `You've spent ${formatINR(totalSpent)} this month against a ${formatINR(monthlyBudget)} budget.`}
              </Text>

              <View style={s.insightStats}>
                <View style={s.insightStatCard}>
                  <Text style={s.insightStatLabel}>PROJECTED SAVINGS</Text>
                  <Text style={[s.insightStatValue, { color: C.primary }]}>
                    {formatINR(projectedSavings)}
                  </Text>
                </View>
                <View style={s.insightStatCard}>
                  <Text style={s.insightStatLabel}>DAILY CAP</Text>
                  <Text style={s.insightStatValue}>{formatINR(dailyCap)}</Text>
                </View>
              </View>
            </View>

            {/* Mini bar chart */}
            <View style={s.miniChart}>
              {[0.5, 0.75, 0.65, 0.85, 0.5, 1, 0.75].map((h, i) => (
                <View
                  key={i}
                  style={[
                    s.miniBar,
                    {
                      height: `${h * 100}%` as any,
                      backgroundColor:
                        h >= 1 ? C.primary : C.primary + Math.round(h * 200).toString(16).padStart(2, "0"),
                    },
                    h >= 1 && {
                      ...Platform.select({
                        ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
                        android: { elevation: 4 },
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Set New Goal Modal ──────────────────────────────── */}
      <Modal visible={showGoalModal} transparent animationType="slide" onRequestClose={() => setShowGoalModal(false)}>
        <KeyboardAvoidingView style={ms.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={() => setShowGoalModal(false)} />
          <View style={ms.sheet}>
            {/* Header */}
            <View style={ms.sheetHeader}>
              <Text style={ms.sheetTitle}>Set New Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <SvgXml xml={closeIcon.replace(/currentColor/g, C.outline)} width={22} height={22} />
              </TouchableOpacity>
            </View>

            {/* Category Selection */}
            <Text style={ms.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.catScroll} contentContainerStyle={ms.catScrollContent}>
              {availableCategories.map((c: any) => {
                const val = typeof c === "string" ? c : c.value;
                const isSelected = selectedCat === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setSelectedCat(val)}
                    style={[ms.catChip, isSelected && ms.catChipActive]}
                    activeOpacity={0.7}
                  >
                    <SvgXml xml={getCatIcon(val).replace(/currentColor/g, isSelected ? C.onPrimary : C.onSurfaceVar)} width={16} height={16} />
                    <Text style={[ms.catChipText, isSelected && ms.catChipTextActive]}>
                      {getCategoryLabel(val)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Budget Input */}
            <Text style={ms.label}>MONTHLY BUDGET (₹)</Text>
            <TextInput
              style={ms.input}
              value={budgetInput}
              onChangeText={setBudgetInput}
              placeholder="e.g. 5000"
              placeholderTextColor={C.outline}
              keyboardType="numeric"
              returnKeyType="done"
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[ms.saveBtn, (!selectedCat || !budgetInput || saving) && { opacity: 0.4 }]}
              onPress={handleSaveGoal}
              disabled={!selectedCat || !budgetInput || saving}
              activeOpacity={0.85}
            >
              <Text style={ms.saveBtnText}>{saving ? "Saving…" : "Create Goal"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // ── Summary ────────────────────────────────────────────────────────────────
  summarySection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  cycleLabel: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
  },
  bigNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  bigSpent: {
    color: C.onSurface,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -2,
  },
  bigBudget: {
    color: C.surfaceHighest,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  overallBarWrap: {
    height: 14,
    backgroundColor: C.surface,
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "center",
  },

  // ── Actions Row ────────────────────────────────────────────────────────────
  actionsRow: {
    paddingHorizontal: 20,
    marginBottom: 36,
    gap: 12,
  },
  remainingCard: {
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  remainingLabel: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 6,
  },
  remainingValue: {
    color: C.onSurface,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  setGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  setGoalText: {
    color: C.onPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Goals Section ──────────────────────────────────────────────────────────
  goalsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  goalsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  goalsSectionTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  monthBadge: {
    backgroundColor: C.secondaryContainer + "33",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  monthBadgeText: {
    color: C.secondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },

  goalsGrid: {
    gap: 14,
  },
  goalCard: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
    justifyContent: "space-between",
    minHeight: 160,
  },
  goalCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  goalPct: {
    color: C.outline,
    fontSize: 13,
    fontWeight: "600",
  },
  goalCardBottom: {},
  goalName: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  goalAmounts: {
    color: C.onSurfaceVar,
    fontSize: 13,
    marginBottom: 0,
  },
  noBudgetBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.surfaceHighest,
  },
  noBudgetText: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 28,
  },
  emptyText: {
    color: C.outline,
    fontSize: 14,
    textAlign: "center",
  },

  // ── Insight Panel ──────────────────────────────────────────────────────────
  insightPanel: {
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 28,
    backgroundColor: C.surfaceHighest + "66",
    borderWidth: 1,
    borderColor: C.outlineVar + "10",
    overflow: "hidden",
    position: "relative",
  },
  insightGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.primary + "0D",
  },
  insightContent: {
    zIndex: 1,
  },
  insightLeft: {
    marginBottom: 20,
  },
  insightHeadline: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  insightStats: {
    flexDirection: "row",
    gap: 12,
  },
  insightStatCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
  },
  insightStatLabel: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },
  insightStatValue: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -1,
  },

  // ── Mini Chart ─────────────────────────────────────────────────────────────
  miniChart: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 4,
  },
  miniBar: {
    flex: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
});

// ── Modal Styles ──────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1, backgroundColor: "#00000088" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  label: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 10,
    marginTop: 4,
  },
  catScroll: { marginBottom: 20 },
  catScrollContent: { gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceHighest,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  catChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  catChipText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "600",
  },
  catChipTextActive: {
    color: C.onPrimary,
  },
  input: {
    backgroundColor: C.surfaceHighest,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  saveBtnText: {
    color: C.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
