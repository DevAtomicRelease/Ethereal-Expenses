/**
 * Adaptive Thresholds Screen — Spending guardrails dashboard.
 *
 * Layout (from HTML mockup):
 *  1. Header: ← back + "Obsidian Orchard"
 *  2. Hero: "Risk Management" badge + "Adaptive Thresholds" title + description
 *  3. Threshold Cards: Daily / Weekly / Monthly — each with:
 *       - Label + period icon
 *       - Big amount display
 *       - Animated progress bar (consumed %)
 *       - "Adjust" button
 *  4. "Update Threshold" CTA button
 *  5. Predictive Safety insight panel (health score + volatility)
 *
 * Backend data:
 *  - useThresholds() → daily, weekly, monthly, per_category, breach_days
 *  - useExpenses()   → actual spend to compute consumed %
 *  - useRisk()       → risk_score for health score display
 */
import React, { useMemo, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useThresholds } from "@/api/queries/useThresholds";
import { useExpenses } from "@/api/queries/useExpenses";
import { useRisk } from "@/api/queries/useRisk";
import { formatINR } from "@/utils/currency";

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
  secondary: "#C0CAAF",
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const todayIcon = `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" fill="currentColor"/></svg>`;
const weekIcon = `<svg viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="currentColor"/></svg>`;
const monthIcon = `<svg viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V10h16v11zm0-13H4V5h16v3z" fill="currentColor"/></svg>`;
const insightIcon = `<svg viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill="currentColor"/></svg>`;

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function AnimatedBar({ pct }: { pct: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(pct, 100),
      duration: 1000,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const color = pct > 85 ? C.error : C.primary;

  return (
    <View style={bs.track}>
      <Animated.View
        style={[
          bs.fill,
          {
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const bs = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: C.surfaceHigh,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
});

// ─── Threshold Card Component ─────────────────────────────────────────────────
function ThresholdCard({
  label,
  period,
  amount,
  consumedPct,
  iconXml,
  onAdjust,
}: {
  label: string;
  period: string;
  amount: number;
  consumedPct: number;
  iconXml: string;
  onAdjust: () => void;
}) {
  return (
    <View style={s.thresholdCard}>
      {/* Top row: label + icon */}
      <View style={s.cardTopRow}>
        <View>
          <Text style={s.cardLabel}>{label.toUpperCase()} LIMIT</Text>
          <Text style={s.cardSubtitle}>{label}</Text>
        </View>
        <View style={s.cardIconWrap}>
          <SvgXml
            xml={iconXml.replace(/currentColor/g, C.primary)}
            width={22}
            height={22}
          />
        </View>
      </View>

      {/* Big amount */}
      <View style={s.amountRow}>
        <Text style={s.amountBig}>{formatINR(amount)}</Text>
        <Text style={s.amountPeriod}> / {period}</Text>
      </View>

      {/* Progress bar */}
      <AnimatedBar pct={consumedPct} />

      {/* Bottom row: consumed + adjust */}
      <View style={s.cardBottomRow}>
        <Text style={s.consumedText}>{Math.round(consumedPct)}% CONSUMED</Text>
        <TouchableOpacity onPress={onAdjust} activeOpacity={0.7}>
          <Text style={s.adjustText}>Adjust</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ThresholdsScreen() {
  const router = useRouter();
  const { data: thresholds } = useThresholds();
  const { data: expenseData } = useExpenses({ page: 1, limit: 200 });
  const { data: riskData } = useRisk();

  // ── Compute consumed amounts ───────────────────────────────────────────────
  const expenses = useMemo(() => {
    return (expenseData as any)?.expenses ?? (expenseData as any)?.transactions ?? [];
  }, [expenseData]);

  const { dailySpent, weeklySpent, monthlySpent } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    expenses.forEach((e: any) => {
      const ts = new Date(e.timestamp || e.created_at || 0);
      const amt = e.amount || 0;
      if (ts >= monthStart) {
        monthly += amt;
        if (ts >= weekStart) {
          weekly += amt;
          if (ts >= todayStart) {
            daily += amt;
          }
        }
      }
    });

    return { dailySpent: daily, weeklySpent: weekly, monthlySpent: monthly };
  }, [expenses]);

  const dailyLimit = thresholds?.daily ?? 2000;
  const weeklyLimit = thresholds?.weekly ?? 10000;
  const monthlyLimit = thresholds?.monthly ?? 35000;

  const dailyPct = dailyLimit > 0 ? (dailySpent / dailyLimit) * 100 : 0;
  const weeklyPct = weeklyLimit > 0 ? (weeklySpent / weeklyLimit) * 100 : 0;
  const monthlyPct = monthlyLimit > 0 ? (monthlySpent / monthlyLimit) * 100 : 0;

  // ── Risk / Health data ─────────────────────────────────────────────────────
  const healthScore = riskData
    ? Math.max(100 - (riskData.risk_score ?? riskData.score ?? 0), 0)
    : 94;
  const riskLevel = riskData?.risk_level ?? riskData?.level ?? "low";
  const volatility =
    riskLevel === "high" ? "High" : riskLevel === "medium" ? "Moderate" : "Low";

  // ── Projected burn rate comparison ─────────────────────────────────────────
  const burnPct = monthlyLimit > 0 ? Math.round((1 - monthlySpent / monthlyLimit) * 100) : 0;

  const handleAdjust = (label: string) => {
    Alert.alert(
      `Adjust ${label} Limit`,
      "Threshold editing will be available in the next release. The system auto-adjusts based on your behavioral patterns.",
    );
  };

  const handleUpdate = () => {
    Alert.alert(
      "Update Thresholds",
      "Threshold updates will be synced with the intelligence engine in the next release.",
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml
            xml={backArrow.replace(/currentColor/g, C.primary)}
            width={22}
            height={22}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>AtomicShift</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={s.heroSection}>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>RISK MANAGEMENT</Text>
          </View>
          <Text style={s.heroTitle}>
            Adaptive{" "}
            <Text style={{ color: C.primary }}>Thresholds</Text>
          </Text>
          <Text style={s.heroDesc}>
            Configure your organic spending guardrails. Our system adjusts your
            liquidity based on behavioral patterns.
          </Text>
        </View>

        {/* ── Threshold Cards ──────────────────────────────── */}
        <View style={s.cardsSection}>
          <ThresholdCard
            label="Daily"
            period="24 hours"
            amount={dailyLimit}
            consumedPct={dailyPct}
            iconXml={todayIcon}
            onAdjust={() => handleAdjust("Daily")}
          />
          <ThresholdCard
            label="Weekly"
            period="7 days"
            amount={weeklyLimit}
            consumedPct={weeklyPct}
            iconXml={weekIcon}
            onAdjust={() => handleAdjust("Weekly")}
          />
          <ThresholdCard
            label="Monthly"
            period="30 days"
            amount={monthlyLimit}
            consumedPct={monthlyPct}
            iconXml={monthIcon}
            onAdjust={() => handleAdjust("Monthly")}
          />

          {/* ── CTA Button ─────────────────────────────────── */}
          <TouchableOpacity
            style={s.updateBtn}
            activeOpacity={0.85}
            onPress={handleUpdate}
          >
            <Text style={s.updateBtnText}>Update Threshold</Text>
          </TouchableOpacity>
        </View>

        {/* ── Predictive Safety Panel ──────────────────────── */}
        <View style={s.insightPanel}>
          <View style={s.insightHeader}>
            <SvgXml
              xml={insightIcon.replace(/currentColor/g, C.primary)}
              width={26}
              height={26}
            />
            <Text style={s.insightTitle}>Predictive Safety</Text>
          </View>

          <Text style={s.insightDesc}>
            Based on your current trajectory, you are{" "}
            <Text style={{ color: C.primary, fontWeight: "700" }}>
              {burnPct}% below
            </Text>{" "}
            your projected monthly burn rate. AtomicShift suggests maintaining these
            thresholds for optimal growth.
          </Text>

          <View style={s.insightGrid}>
            <View style={s.insightStatCard}>
              <Text style={s.insightStatLabel}>HEALTH SCORE</Text>
              <Text style={[s.insightStatValue, { color: C.primary }]}>
                {Math.round(healthScore)}/100
              </Text>
            </View>
            <View style={s.insightStatCard}>
              <Text style={s.insightStatLabel}>VOLATILITY</Text>
              <Text style={[s.insightStatValue, { color: C.primary }]}>
                {volatility}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: C.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.primary + "15",
    borderWidth: 1,
    borderColor: C.primary + "33",
    marginBottom: 14,
  },
  heroBadgeText: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  heroTitle: {
    color: C.onSurface,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 42,
    marginBottom: 12,
  },
  heroDesc: {
    color: C.onSurfaceVar,
    fontSize: 14,
    fontWeight: "300",
    lineHeight: 22,
    maxWidth: 320,
  },

  // ── Threshold Cards ────────────────────────────────────────────────────────
  cardsSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 32,
  },
  thresholdCard: {
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  cardLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  cardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 24,
  },
  amountBig: {
    color: C.onSurface,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -2,
  },
  amountPeriod: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "500",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  consumedText: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  adjustText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ── Update Button ──────────────────────────────────────────────────────────
  updateBtn: {
    backgroundColor: C.primary,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: { elevation: 8 },
    }),
  },
  updateBtnText: {
    color: C.onPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Insight Panel ──────────────────────────────────────────────────────────
  insightPanel: {
    marginHorizontal: 20,
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  insightTitle: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  insightDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "300",
    lineHeight: 21,
    marginBottom: 20,
  },
  insightGrid: {
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
    color: C.onSurfaceVar,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 6,
  },
  insightStatValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});
