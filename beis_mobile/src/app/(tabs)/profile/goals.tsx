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
import { CATEGORIES, CATEGORY_LIST, getCategoryLabel } from "@/utils/categories";
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
  subscriptions: `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/></svg>`,
  travel: `<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/></svg>`,
  alcohol: `<svg viewBox="0 0 24 24"><path d="M6 3l1 5h10l1-5H6zm14.5 6H3.5L2 22h20l-1.5-13zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="currentColor"/></svg>`,
  dining_out: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h18v-2H2v2z" fill="currentColor"/></svg>`,
  personal_care: `<svg viewBox="0 0 24 24"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z" fill="currentColor"/></svg>`,
  electronics: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
  clothing: `<svg viewBox="0 0 24 24"><path d="M14.6 1.2c-.2-.2-.6-.2-.8 0L12 3 10.2 1.2c-.2-.2-.6-.2-.8 0L6 4.6v5.8l3-.2v9.4c0 .8.6 1.4 1.4 1.4h3.2c.8 0 1.4-.6 1.4-1.4v-9.4l3 .2V4.6l-3.4-3.4z" fill="currentColor"/></svg>`,
  gifts: `<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" fill="currentColor"/></svg>`,
  charity: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
  fitness: `<svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" fill="currentColor"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z" fill="currentColor"/></svg>`,
  insurance: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`,
  emi: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="currentColor"/></svg>`,
  recharge: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
  misc: `<svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
};

// Fallback icon
const defaultCatIcon = `<svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`;

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

  // ── Goal modal state (create or edit) ──────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null); // non-null = edit mode
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

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
    return CATEGORY_LIST.filter((c: string) => {
      return !perCategoryBudget[c];
    });
  }, [perCategoryBudget]);

  const handleSetGoal = () => {
    setEditingCat(null);
    setSelectedCat(null);
    setBudgetInput("");
    setShowCatPicker(false);
    setShowGoalModal(true);
  };

  const handleEditGoal = (cat: string, currentBudget: number) => {
    setEditingCat(cat);
    setSelectedCat(cat);
    setBudgetInput(String(currentBudget));
    setShowCatPicker(false);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = (cat: string) => {
    Alert.alert(
      "Remove Goal",
      `Remove the spending goal for ${getCategoryLabel(cat)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = { ...perCategoryBudget };
              delete updated[cat];
              await dataClient.put("thresholds", {
                json: {
                  daily: thresholds?.daily ?? 2000,
                  weekly: thresholds?.weekly ?? 10000,
                  monthly: thresholds?.monthly ?? 35000,
                  per_category: updated,
                },
              }).json();
              queryClient.invalidateQueries({ queryKey: ["thresholds"] });
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to remove goal.");
            }
          },
        },
      ]
    );
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
      const action = editingCat ? "Updated" : "Created";
      Alert.alert(`Goal ${action}`, `${getCategoryLabel(selectedCat)} budget set to ${formatINR(amount)}/month.`);
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
          <Text style={s.headerTitle}>Spending Goals</Text>
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
                const hasBudget = goal.budget > 0;
                return (
                  <TouchableOpacity
                    key={goal.key}
                    style={s.goalCard}
                    activeOpacity={hasBudget ? 0.7 : 1}
                    onPress={() => hasBudget && handleEditGoal(goal.key, goal.budget)}
                  >
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
                        {hasBudget ? ` of ${formatINR(goal.budget)}` : ""}
                      </Text>
                      {hasBudget && (
                        <View style={{ marginTop: 10 }}>
                          <AnimatedBar pct={goal.pct} color={barColor} />
                        </View>
                      )}
                      {hasBudget ? (
                        <View style={s.goalActions}>
                          <TouchableOpacity
                            style={s.goalEditBtn}
                            onPress={() => handleEditGoal(goal.key, goal.budget)}
                            activeOpacity={0.7}
                          >
                            <Text style={s.goalEditText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.goalDeleteBtn}
                            onPress={() => handleDeleteGoal(goal.key)}
                            activeOpacity={0.7}
                          >
                            <Text style={s.goalDeleteText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={s.noBudgetBadge}
                          onPress={() => { setEditingCat(null); setSelectedCat(goal.key); setBudgetInput(""); setShowCatPicker(false); setShowGoalModal(true); }}
                          activeOpacity={0.7}
                        >
                          <Text style={s.noBudgetText}>+ SET LIMIT</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
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
              <Text style={ms.sheetTitle}>{editingCat ? "Edit Goal" : "Set New Goal"}</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <SvgXml xml={closeIcon.replace(/currentColor/g, C.outline)} width={22} height={22} />
              </TouchableOpacity>
            </View>

            {/* Category Selection */}
            <Text style={ms.label}>CATEGORY</Text>
            {editingCat ? (
              /* In edit mode, show locked category badge */
              <View style={[ms.catChip, ms.catChipActive, { alignSelf: "flex-start", marginBottom: 20 }]}>
                <SvgXml xml={getCatIcon(editingCat).replace(/currentColor/g, C.onPrimary)} width={16} height={16} />
                <Text style={[ms.catChipText, ms.catChipTextActive]}>
                  {getCategoryLabel(editingCat)}
                </Text>
              </View>
            ) : (
              /* In create mode, show dropdown picker */
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  style={ms.dropdownTrigger}
                  onPress={() => setShowCatPicker(!showCatPicker)}
                  activeOpacity={0.7}
                >
                  {selectedCat ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <SvgXml xml={getCatIcon(selectedCat).replace(/currentColor/g, C.primary)} width={18} height={18} />
                      <Text style={ms.dropdownText}>{getCategoryLabel(selectedCat)}</Text>
                    </View>
                  ) : (
                    <Text style={ms.dropdownPlaceholder}>Select a category</Text>
                  )}
                  <Text style={ms.dropdownArrow}>{showCatPicker ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {showCatPicker && (
                  <ScrollView style={ms.dropdownList} nestedScrollEnabled>
                    {CATEGORY_LIST.map((cat: string) => {
                      const isSelected = selectedCat === cat;
                      const alreadyBudgeted = !!perCategoryBudget[cat];
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[ms.dropdownItem, isSelected && ms.dropdownItemActive]}
                          onPress={() => { setSelectedCat(cat); setShowCatPicker(false); }}
                          activeOpacity={0.7}
                        >
                          <SvgXml xml={getCatIcon(cat).replace(/currentColor/g, isSelected ? C.onPrimary : C.onSurfaceVar)} width={18} height={18} />
                          <Text style={[ms.dropdownItemText, isSelected && ms.dropdownItemTextActive]}>
                            {getCategoryLabel(cat)}
                          </Text>
                          {alreadyBudgeted && !isSelected && (
                            <Text style={ms.dropdownAlreadySet}>
                              {formatINR(perCategoryBudget[cat])}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

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
              <Text style={ms.saveBtnText}>{saving ? "Saving…" : editingCat ? "Update Goal" : "Create Goal"}</Text>
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
  goalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  goalEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.primary + "15",
    borderWidth: 1,
    borderColor: C.primary + "33",
  },
  goalEditText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  goalDeleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.errorContainer + "15",
    borderWidth: 1,
    borderColor: C.errorContainer + "33",
  },
  goalDeleteText: {
    color: C.error,
    fontSize: 12,
    fontWeight: "700",
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
  // ── Dropdown Picker ──
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surfaceHighest,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  dropdownText: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  dropdownPlaceholder: {
    color: C.outline,
    fontSize: 15,
  },
  dropdownArrow: {
    color: C.outline,
    fontSize: 12,
  },
  dropdownList: {
    maxHeight: 220,
    backgroundColor: C.surfaceHighest,
    borderRadius: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "15",
  },
  dropdownItemActive: {
    backgroundColor: C.primary,
  },
  dropdownItemText: {
    color: C.onSurfaceVar,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  dropdownItemTextActive: {
    color: C.onPrimary,
  },
  dropdownAlreadySet: {
    color: C.outline,
    fontSize: 11,
    fontWeight: "600",
  },
});
