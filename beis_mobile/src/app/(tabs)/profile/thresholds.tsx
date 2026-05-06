/**
 * Budget Limits — Set and manage daily / weekly / monthly spending caps.
 * Uses GET /thresholds and PUT /thresholds.
 */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Platform, Animated, Easing, Alert, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useThresholds } from "@/api/queries/useThresholds";
import { useExpenses } from "@/api/queries/useExpenses";
import { useQueryClient } from "@tanstack/react-query";
import { dataClient } from "@/api/dataClient";

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
  green: "#4CAF50", secondary: "#C0CAAF",
} as const;

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const todayIcon = `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" fill="currentColor"/></svg>`;
const weekIcon = `<svg viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="currentColor"/></svg>`;
const monthIcon = `<svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V10h16v11zm0-13H4V5h16v3z" fill="currentColor"/></svg>`;
const checkIcon = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`;

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ─── Animated Progress Bar ──────────────────────────────────────────────────
function AnimatedBar({ pct }: { pct: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(pct, 100),
      duration: 800, delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const color = pct > 85 ? C.error : pct > 60 ? "#FFD54F" : C.green;
  return (
    <View style={bs.track}>
      <Animated.View style={[bs.fill, {
        backgroundColor: color,
        width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
      }]} />
    </View>
  );
}
const bs = StyleSheet.create({
  track: { height: 6, backgroundColor: C.surfaceHigh, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

// ─── Limit Card ─────────────────────────────────────────────────────────────
function LimitCard({
  label, period, amount, spent, iconXml, isEditing, editValue,
  onToggleEdit, onChangeValue,
}: {
  label: string; period: string; amount: number; spent: number;
  iconXml: string; isEditing: boolean; editValue: string;
  onToggleEdit: () => void; onChangeValue: (v: string) => void;
}) {
  const pct = amount > 0 ? (spent / amount) * 100 : 0;
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View>
          <Text style={s.cardLabel}>{label.toUpperCase()}</Text>
          <Text style={s.cardPeriod}>{period}</Text>
        </View>
        <View style={s.cardIconWrap}>
          <SvgXml xml={iconXml.replace(/currentColor/g, C.primary)} width={20} height={20} />
        </View>
      </View>

      {isEditing ? (
        <View style={s.editRow}>
          <Text style={s.editPrefix}>₹</Text>
          <TextInput
            style={s.editInput}
            value={editValue}
            onChangeText={onChangeValue}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={C.outlineVar + "55"}
          />
        </View>
      ) : (
        <Text style={s.cardAmount}>{formatCurrency(amount)}</Text>
      )}

      <AnimatedBar pct={pct} />

      <View style={s.cardBottom}>
        <Text style={s.spentText}>
          {formatCurrency(Math.round(spent))} spent ({Math.round(pct)}%)
        </Text>
        <TouchableOpacity onPress={onToggleEdit} activeOpacity={0.7}>
          <Text style={s.editBtn}>{isEditing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ThresholdsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: thresholds } = useThresholds();
  const { data: expenseData } = useExpenses({ page: 1, limit: 500 });
  const [saving, setSaving] = useState(false);

  // Editable state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [dailyVal, setDailyVal] = useState("");
  const [weeklyVal, setWeeklyVal] = useState("");
  const [monthlyVal, setMonthlyVal] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync from server data
  useEffect(() => {
    if (thresholds) {
      setDailyVal(String(thresholds.daily ?? 2000));
      setWeeklyVal(String(thresholds.weekly ?? 10000));
      setMonthlyVal(String(thresholds.monthly ?? 35000));
    }
  }, [thresholds]);

  const dailyLimit = Number(dailyVal) || 0;
  const weeklyLimit = Number(weeklyVal) || 0;
  const monthlyLimit = Number(monthlyVal) || 0;

  // Compute spent amounts
  const expenses = useMemo(() => {
    return (expenseData as any)?.transactions ?? (expenseData as any)?.expenses ?? [];
  }, [expenseData]);

  const { dailySpent, weeklySpent, monthlySpent } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let daily = 0, weekly = 0, monthly = 0;
    expenses.forEach((e: any) => {
      const ts = new Date(e.timestamp || 0);
      const amt = e.amount || 0;
      if (ts >= monthStart) { monthly += amt; if (ts >= weekStart) { weekly += amt; if (ts >= todayStart) { daily += amt; } } }
    });
    return { dailySpent: daily, weeklySpent: weekly, monthlySpent: monthly };
  }, [expenses]);

  // Save to backend
  const handleSave = async () => {
    Keyboard.dismiss();
    setSaving(true);
    try {
      await dataClient.put("thresholds", {
        json: { daily: dailyLimit, weekly: weeklyLimit, monthly: monthlyLimit },
      }).json();
      queryClient.invalidateQueries({ queryKey: ["thresholds"] });
      setEditingField(null);
      setHasChanges(false);
      Alert.alert("Saved", "Your budget limits have been updated.");
    } catch (e: any) {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = (field: string) => {
    if (editingField === field) {
      setEditingField(null);
    } else {
      setEditingField(field);
    }
    setHasChanges(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Budget Limits</Text>
          <Text style={s.headerSub}>SPENDING CAPS</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Set Your Limits</Text>
          <Text style={s.heroDesc}>
            Define daily, weekly, and monthly spending caps.
            You'll see how much you've used in real time.
          </Text>
        </View>

        {/* Limit cards */}
        <View style={s.cardsSection}>
          <LimitCard
            label="Daily" period="per day" amount={dailyLimit} spent={dailySpent}
            iconXml={todayIcon} isEditing={editingField === "daily"}
            editValue={dailyVal}
            onToggleEdit={() => toggleEdit("daily")}
            onChangeValue={(v) => { setDailyVal(v.replace(/[^0-9]/g, "")); setHasChanges(true); }}
          />
          <LimitCard
            label="Weekly" period="per week" amount={weeklyLimit} spent={weeklySpent}
            iconXml={weekIcon} isEditing={editingField === "weekly"}
            editValue={weeklyVal}
            onToggleEdit={() => toggleEdit("weekly")}
            onChangeValue={(v) => { setWeeklyVal(v.replace(/[^0-9]/g, "")); setHasChanges(true); }}
          />
          <LimitCard
            label="Monthly" period="per month" amount={monthlyLimit} spent={monthlySpent}
            iconXml={monthIcon} isEditing={editingField === "monthly"}
            editValue={monthlyVal}
            onToggleEdit={() => toggleEdit("monthly")}
            onChangeValue={(v) => { setMonthlyVal(v.replace(/[^0-9]/g, "")); setHasChanges(true); }}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          <SvgXml xml={checkIcon.replace(/currentColor/g, C.onPrimary)} width={18} height={18} />
          <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save Limits"}</Text>
        </TouchableOpacity>

        {/* Quick tip */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>💡 Quick tip</Text>
          <Text style={s.tipText}>
            Try setting your monthly limit first, then divide for weekly and daily
            targets. A good starting point is your average monthly spend from the
            Spending Trends page.
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

  hero: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  heroTitle: { color: C.onSurface, fontSize: 26, fontWeight: "800", letterSpacing: -0.8, marginBottom: 8 },
  heroDesc: { color: C.onSurfaceVar + "99", fontSize: 14, lineHeight: 21 },

  cardsSection: { paddingHorizontal: 16, gap: 14 },

  // Card
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.outlineVar + "15" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardLabel: { color: C.primary, fontSize: 10, fontWeight: "800", letterSpacing: 2.5, marginBottom: 2 },
  cardPeriod: { color: C.onSurfaceVar + "77", fontSize: 12, fontWeight: "500" },
  cardIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.primary + "15", alignItems: "center", justifyContent: "center" },
  cardAmount: { color: C.onSurface, fontSize: 32, fontWeight: "900", letterSpacing: -1.5, marginBottom: 16 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  spentText: { color: C.onSurfaceVar + "88", fontSize: 11, fontWeight: "600" },
  editBtn: { color: C.primary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },

  // Edit mode
  editRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  editPrefix: { color: C.onSurface, fontSize: 28, fontWeight: "800", marginRight: 4 },
  editInput: { flex: 1, color: C.onSurface, fontSize: 28, fontWeight: "800", padding: 0, borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 4 },

  // Save
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 20, backgroundColor: C.primary, borderRadius: 20, paddingVertical: 18,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: C.onPrimary, fontSize: 16, fontWeight: "800" },

  // Tip
  tipCard: { marginHorizontal: 16, marginTop: 20, backgroundColor: C.primary + "0D", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.primary + "1A" },
  tipTitle: { color: C.primary, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  tipText: { color: C.onSurfaceVar, fontSize: 13, lineHeight: 20 },
});
