/**
 * AI Hub (Insights Tab) — The central intelligence dashboard.
 *
 * Sections:
 *  1. Header — "AI Hub" title
 *  2. Insights narrative card — from GET /insights (or /intelligence narrative)
 *  3. Confidence score badge
 *  4. Core Intelligence Nodes (2-column bento grid) —
 *       Intelligence, Momentum, Behavior (Identity), Thresholds, Anomalies, Risk
 *  5. Risk Assessment card — circular progress + risk level text
 *
 * Backend hooks used:
 *  - useInsights()       → GET /insights
 *  - useIntelligence()   → GET /intelligence
 *  - useMomentum()       → GET /momentum
 *  - useIdentity()       → GET /identity
 *  - useThresholds()     → GET /thresholds
 *  - useAnomalies()      → GET /anomalies
 *  - useRisk()           → GET /risk
 *  - useDataMaturity()   → GET /memory-status
 */
import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { useRouter } from "expo-router";

import { useInsights } from "@/api/queries/useInsights";
import { useIntelligence } from "@/api/queries/useIntelligence";
import { useMomentum } from "@/api/queries/useMomentum";
import { useIdentity } from "@/api/queries/useIdentity";
import { useThresholds } from "@/api/queries/useThresholds";
import { useAnomalies } from "@/api/queries/useAnomalies";
import { useRisk } from "@/api/queries/useRisk";
import { useDataMaturity } from "@/hooks/useDataMaturity";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  primaryDim: "#969359",
  primaryContainer: "#969359",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#939182",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  errorContainer: "#93000A",
  secondary: "#C0CAAF",
  secondaryFixed: "#DCE6CA",
} as const;

// ─── SVG icons (inline for perf) ──────────────────────────────────────────────
const mkIcon = (xml: string, color: string, size = 24) => (
  <SvgXml xml={xml.replace(/currentColor/g, color)} width={size} height={size} />
);

const SVG = {
  memory: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z" fill="currentColor"/></svg>`,
  trending: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="currentColor"/></svg>`,
  fingerprint: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.72 2.54.72.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.11-1.21.11zM14.91 22c-.04 0-.09-.01-.13-.02-4.91-1.31-7.78-6.04-7.78-9.64 0-2.42 2.09-4.39 4.66-4.39h.02c2.57 0 4.66 1.97 4.66 4.39 0 1.44-.43 2.83-1.21 3.88-.12.16-.35.22-.53.13-.2-.1-.29-.33-.21-.54.65-.87 1.01-1.99 1.01-3.15v-.32c-.06-1.86-1.65-3.39-3.72-3.39h-.02c-2.07 0-3.66 1.53-3.66 3.39 0 3.11 2.49 7.2 6.72 8.38.27.07.42.35.35.61-.05.22-.25.37-.46.37z" fill="currentColor"/></svg>`,
  face: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z" fill="currentColor"/></svg>`,
  tune: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" fill="currentColor"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 5h2V3H7v2zm0 8h2v-2H7v2zm0 8h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm-8 0h2v-2H3v2zm0-4h2v-2H3v2zm0-4h2v-2H3v2zm0-4h2V5H3v2zm0-4h2V1H3v2zm4 8h2V9H7v2zm8 8h2v-2h-2v2zm0-4h2v-2h-2v2zm4 0h2v-2h-2v2zm0 4h2v-2h-2v2zm0-8h2v-2h-2v2zm0-4h2V5h-2v2zm0-4V1h-2v2h2zm-4 0h2V1h-2v2zm0 16h2v-2h-2v2zm0-8h2V9h-2v2zm-4-4h2V5h-2v2zm0 4h2V9h-2v2zm0 4h2v-2h-2v2z" fill="currentColor"/></svg>`,
  security: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/></svg>`,
  heatmap: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" fill="currentColor"/></svg>`,
};

// ─── Intelligence grid node definition ────────────────────────────────────────
interface NodeDef {
  title: string;
  route: string;
  iconKey: keyof typeof SVG;
  iconColor: string;
  iconBg: string;
  value?: string;
  sub?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function AIHubScreen() {
  // ── Data hooks ──────────────────────────────────────────────────────────────
  const router = useRouter();
  const { data: insights, isLoading: insightsLoading } = useInsights();
  const { data: intel, isLoading: intelLoading } = useIntelligence();
  const { data: momentum } = useMomentum();
  const { data: identity } = useIdentity();
  const { data: thresholds } = useThresholds();
  const { data: anomalies } = useAnomalies();
  const { data: risk } = useRisk();
  const { txnCount, maturity } = useDataMaturity();

  // ── Chat FAB animation ────────────────────────────────────────────────────
  const fabScale = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const isInsufficient = (intel as any)?.status === "insufficient_data";
  const isLlmUnavailable = (intel as any)?.status === "error" || (intel as any)?.model_unavailable;
  // Use intelligence narrative if available, otherwise build from insights
  const narrative = (() => {
    if (!isInsufficient && !isLlmUnavailable && (intel as any)?.narrative) {
      return (intel as any).narrative as string;
    }
    // Fallback: build a summary from statistical insights data
    if (insights && (insights as any)?.category_breakdown) {
      const ins = insights as any;
      const topCats = Object.entries(ins.category_breakdown ?? {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3);
      const topStr = topCats
        .map(([cat, pct]) => `${cat.replace(/_/g, " ")} (${Math.round((pct as number) * 100)}%)`)
        .join(", ");
      const total = ins.total_spend_90d ?? 0;
      const count = ins.txn_count_90d ?? 0;
      return `Over the last 90 days, you've recorded ${count} transactions totaling ₹${total.toLocaleString("en-IN")}. Your top spending categories are ${topStr}. ${isLlmUnavailable ? "Your spending summary is being updated — check back shortly." : ""}`;
    }
    return null;
  })();
  const riskScore = risk?.risk_score ?? 0;
  const riskLevel = risk?.risk_level ?? "Unknown";
  const anomalyCount = anomalies?.anomaly_count ?? 0;

  // Confidence score from data maturity
  const confidencePct = maturity === "mature"
    ? 98.4
    : maturity === "early"
      ? Math.min(60 + txnCount * 0.5, 95)
      : Math.min(20 + txnCount * 2, 55);

  // ── Grid node data ──────────────────────────────────────────────────────────
  const nodes: NodeDef[] = [
    {
      title: "Spending Trends",
      route: "/(tabs)/insights/analytics",
      iconKey: "memory",
      iconColor: C.primary,
      iconBg: C.primary + "1A",
      value: narrative ? "Active" : "Pending",
      sub: narrative ? `${(narrative as string).slice(0, 40)}…` : "Needs more data",
    },
    {
      title: "Weekly Pulse",
      route: "/(tabs)/insights/momentum",
      iconKey: "trending",
      iconColor: C.primary,
      iconBg: C.primary + "1A",
      value: momentum?.direction
        ? momentum.direction.charAt(0).toUpperCase() + momentum.direction.slice(1)
        : "—",
      sub: momentum?.acceleration != null
        ? `Acceleration: ${momentum.acceleration.toFixed(1)}%`
        : "No data yet",
    },
    {
      title: "Spending Style",
      route: "/(tabs)/insights/behavior",
      iconKey: "fingerprint",
      iconColor: C.primary,
      iconBg: C.primary + "1A",
      value: identity?.primary_identity
        ? (identity.primary_identity as string).replace(/_/g, " ")
        : "—",
      sub: identity?.identity_confidence != null
        ? `Confidence: ${Math.round(identity.identity_confidence * 100)}%`
        : "Checking…",
    },
    {
      title: "Financial Portrait",
      route: "/(tabs)/insights/identity",
      iconKey: "face",
      iconColor: C.primary,
      iconBg: C.primary + "1A",
      value: identity?.identity_stability != null
        ? `Stability: ${identity.identity_stability}`
        : "—",
      sub: identity?.identity_traits?.length
        ? identity.identity_traits.slice(0, 2).join(", ")
        : "No patterns yet",
    },
    {
      title: "Budget Limits",
      route: "/(tabs)/insights/thresholds",
      iconKey: "tune",
      iconColor: C.primary,
      iconBg: C.primary + "1A",
      value: thresholds?.monthly
        ? `₹${thresholds.monthly.toLocaleString()}`
        : "Not set",
      sub: thresholds?.daily
        ? `Daily: ₹${thresholds.daily.toLocaleString()}`
        : "Configure limits",
    },
    {
      title: "Unusual Activity",
      route: "/(tabs)/insights/anomalies",
      iconKey: "warning",
      iconColor: C.error,
      iconBg: C.errorContainer + "33",
      value: anomalyCount > 0 ? `${anomalyCount} detected` : "None",
      sub: anomalyCount > 0
        ? `Latest: ${anomalies!.anomalies[0]?.anomaly_type ?? "unknown"}`
        : "All clear",
    },
  ];

  // ── Loading state ───────────────────────────────────────────────────────────
  if (intelLoading && insightsLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadText, { marginTop: 12 }]}>Loading insights…</Text>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const riskPct = Math.max(Math.min(riskScore, 100), 0);
  // SVG ring math (circumference for r=16)
  const circum = 2 * Math.PI * 16; // ≈ 100.53
  const dashOffset = circum - (riskPct / 100) * circum;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeftBorder} />
          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>YOUR OVERVIEW</Text>
            <Text style={styles.headerTitle}>Insights</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.confidenceValue}>{confidencePct.toFixed(1)}%</Text>
            <Text style={styles.confidenceLabel}>CONFIDENCE</Text>
          </View>
        </View>

        {/* ── Narrative Card ──────────────────────────────── */}
        <View style={styles.narrativeCard}>
          <View style={styles.narrativeBgIcon}>
            {mkIcon(SVG.analytics, C.onSurface + "0F", 100)}
          </View>
          {narrative ? (
            <Text style={styles.narrativeText}>"{narrative}"</Text>
          ) : (
            <Text style={styles.narrativeText}>
              {isInsufficient
                ? `Add ${Math.max(0, ((intel as any)?.required ?? 5) - txnCount)} more transactions to unlock spending insights.`
                : "Loading your spending data…"}
            </Text>
          )}
        </View>

        {/* ── Insights Summary (from GET /insights) ──────── */}
        {insights && (insights as any)?.category_breakdown && (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsSectionLabel}>SPENDING INSIGHTS</Text>

            {/* Stats row */}
            <View style={styles.insightsStatsRow}>
              <View style={styles.insightsStat}>
                <Text style={styles.insightsStatValue}>
                  ₹{((insights as any)?.total_spend_90d ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.insightsStatLabel}>90-DAY SPEND</Text>
              </View>
              <View style={[styles.insightsStat, { borderLeftWidth: 1, borderLeftColor: C.outlineVar + "22" }]}>
                <Text style={styles.insightsStatValue}>
                  {(insights as any)?.txn_count_90d ?? 0}
                </Text>
                <Text style={styles.insightsStatLabel}>TRANSACTIONS</Text>
              </View>
              <View style={[styles.insightsStat, { borderLeftWidth: 1, borderLeftColor: C.outlineVar + "22" }]}>
                <Text style={styles.insightsStatValue}>
                  {(() => {
                    const tp = (insights as any)?.time_pattern ?? {};
                    const peak = Object.entries(tp).sort(([,a],[,b]) => (b as number) - (a as number))[0];
                    return peak ? peak[0].charAt(0).toUpperCase() + peak[0].slice(1) : "—";
                  })()}
                </Text>
                <Text style={styles.insightsStatLabel}>PEAK TIME</Text>
              </View>
            </View>

            {/* Top categories */}
            <Text style={[styles.insightsSectionLabel, { marginTop: 20 }]}>TOP CATEGORIES</Text>
            {Object.entries((insights as any)?.category_breakdown ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([cat, pct]) => (
                <View key={cat} style={styles.catBarRow}>
                  <Text style={styles.catBarLabel}>
                    {cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                  <View style={styles.catBarTrack}>
                    <View style={[styles.catBarFill, { width: `${Math.round((pct as number) * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.catBarPct}>{Math.round((pct as number) * 100)}%</Text>
                </View>
              ))
            }
          </View>
        )}

        {/* ── Core Intelligence Nodes ─────────────────────── */}
        <View style={styles.gridOuter}>
          <Text style={styles.gridLabel}>EXPLORE YOUR FINANCES</Text>
          <View style={styles.grid}>
            {nodes.map((node) => (
              <TouchableOpacity
                key={node.title}
                style={styles.gridNode}
                activeOpacity={0.75}
                onPress={() => router.push(node.route as any)}
              >
                <View style={[styles.nodeIcon, { backgroundColor: node.iconBg }]}>
                  {mkIcon(SVG[node.iconKey], node.iconColor, 22)}
                </View>
                <View style={styles.nodeBottom}>
                  <Text
                    style={[
                      styles.nodeTitle,
                      node.iconColor === C.error && { color: C.error },
                    ]}
                  >
                    {node.title}
                  </Text>
                  {node.value ? (
                    <Text style={styles.nodeValue} numberOfLines={1}>
                      {node.value}
                    </Text>
                  ) : null}
                  {node.sub ? (
                    <Text style={styles.nodeSub} numberOfLines={1}>
                      {node.sub}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Risk Assessment ─────────────────────────────── */}
        <View style={styles.riskSection}>
          {/* Risk card */}
          <TouchableOpacity
            style={styles.riskCard}
            activeOpacity={0.75}
            onPress={() => router.push("/(tabs)/insights/risk-breakdown" as any)}
          >
            <Text style={styles.riskLabel}>RISK ASSESSMENT</Text>
            <View style={styles.riskBody}>
              {/* Ring */}
              <View style={styles.riskRingWrap}>
                <SvgXml
                  xml={`<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="${C.surface}" stroke-width="3"/>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="${riskPct > 60 ? C.error : C.primary}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${circum}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 18 18)"/>
                  </svg>`}
                  width={80}
                  height={80}
                />
                <View style={styles.riskRingLabel}>
                  <Text style={styles.riskScoreText}>{Math.round(riskScore)}</Text>
                </View>
              </View>
              {/* Text */}
              <View style={styles.riskTextBlock}>
                <Text style={styles.riskLevelText}>
                  {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                </Text>
                <Text style={styles.riskDesc}>
                  {risk?.risk_drivers?.length
                    ? risk.risk_drivers.join(". ") + "."
                    : "Spending is steady. No concerns right now."}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Heatmap card */}
          <TouchableOpacity
            style={styles.heatmapCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/insights/heatmap")}
          >
            <View style={styles.heatmapLeft}>
              <View style={styles.heatmapIconWrap}>
                {mkIcon(SVG.heatmap, C.primary, 22)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heatmapTitle}>Spending Heatmap</Text>
                <Text style={styles.heatmapDesc}>
                  Visualise your daily spending patterns on a calendar
                </Text>
              </View>
            </View>
            <Text style={styles.heatmapArrow}>›</Text>
          </TouchableOpacity>

          {/* Streaks & Challenges card */}
          <TouchableOpacity
            style={styles.heatmapCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/insights/streaks")}
          >
            <View style={styles.heatmapLeft}>
              <View style={[styles.heatmapIconWrap, { backgroundColor: "#FF980015" }]}>
                {mkIcon(SVG.fire, "#FF9800", 22)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heatmapTitle}>Streaks & Challenges</Text>
                <Text style={styles.heatmapDesc}>
                  Gamified spending habits and achievements
                </Text>
              </View>
            </View>
            <Text style={styles.heatmapArrow}>›</Text>
          </TouchableOpacity>

          {/* Gold accent card */}
          <View style={styles.secureCard}>
            <View style={styles.secureIconWrap}>
              {mkIcon(SVG.security, C.onPrimary, 22)}
            </View>
            <Text style={styles.secureTitle}>Your Data, Protected</Text>
            <Text style={styles.secureDesc}>
              Your financial data is encrypted and securely stored.
            </Text>
          </View>
        </View>

        {/* Bottom spacer for nav pill */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Floating Chat Button ── */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fabInner}
          activeOpacity={0.8}
          onPress={() => router.push("/(tabs)/insights/chat")}
        >
          {mkIcon(SVG.chat, C.onPrimary, 24)}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centered: { justifyContent: "center", alignItems: "center" },

  // ── Floating Chat Button ──
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 100,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  scroll: { paddingBottom: 40 },
  loadText: { color: C.onSurfaceVar, fontSize: 13 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  headerLeftBorder: {
    width: 4,
    backgroundColor: C.primary,
    borderRadius: 2,
    alignSelf: "stretch",
    marginRight: 16,
  },
  headerContent: { flex: 1 },
  headerLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    color: C.onSurface,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  headerRight: { alignItems: "flex-end", paddingTop: 4 },
  confidenceValue: {
    color: C.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  confidenceLabel: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 2,
  },

  // ── Narrative Card ─────────────────────────────────────────────────────────
  narrativeCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 28,
    padding: 28,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
    overflow: "hidden",
    position: "relative",
  },
  narrativeBgIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    opacity: 0.06,
  },
  narrativeText: {
    color: C.onSurfaceVar,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
  },

  // ── Intelligence Grid ──────────────────────────────────────────────────────
  gridOuter: {
    marginHorizontal: 20,
    borderRadius: 36,
    padding: 20,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },
  gridLabel: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
    paddingLeft: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "column",
    gap: 12,
  },
  gridNode: {
    width: "100%",
    backgroundColor: C.surface + "80",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  nodeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  nodeBottom: { flex: 1 },
  nodeTitle: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  nodeValue: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  nodeSub: {
    color: C.onSurfaceVar + "99",
    fontSize: 11,
    marginTop: 2,
  },

  // ── Risk Section ───────────────────────────────────────────────────────────
  riskSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  riskCard: {
    borderRadius: 30,
    padding: 28,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
  },
  riskLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  riskBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  riskRingWrap: {
    width: 80,
    height: 80,
    position: "relative",
  },
  riskRingLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  riskScoreText: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
  },
  riskTextBlock: { flex: 1 },
  riskLevelText: {
    color: C.secondaryFixed,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  riskDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Secure Card ────────────────────────────────────────────────────────────
  secureCard: {
    borderRadius: 30,
    padding: 28,
    backgroundColor: C.primary,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 14 },
    }),
  },
  secureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.onPrimary + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  secureTitle: {
    color: C.onPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  secureDesc: {
    color: C.onPrimary + "CC",
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Insights Summary ──────────────────────────────────────────────────────
  insightsSection: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 22,
  },
  insightsSectionLabel: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  insightsStatsRow: {
    flexDirection: "row",
  },
  insightsStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  insightsStatValue: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  insightsStatLabel: {
    color: C.onSurfaceVar + "80",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  catBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  catBarLabel: {
    color: C.onSurfaceVar,
    fontSize: 12,
    fontWeight: "600",
    width: 85,
  },
  catBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: C.surfaceHighest,
    borderRadius: 3,
    overflow: "hidden",
  },
  catBarFill: {
    height: "100%",
    backgroundColor: C.primary,
    borderRadius: 3,
  },
  catBarPct: {
    color: C.onSurfaceVar + "99",
    fontSize: 11,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },

  // ── Heatmap Card ──
  heatmapCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heatmapLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  heatmapIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  heatmapDesc: {
    color: C.onSurfaceVar + "99",
    fontSize: 12,
    marginTop: 2,
  },
  heatmapArrow: {
    color: C.primary,
    fontSize: 24,
    fontWeight: "300",
    marginLeft: 8,
  },
});
