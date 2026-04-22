/**
 * Risk Breakdown Screen — Premium risk analysis dashboard.
 *
 * Layout (from HTML mockup):
 *  1. Header: ← back + "Risk Breakdown" + info icon
 *  2. Primary Risk Score: large circular SVG gauge with score/label
 *  3. Risk History: bar chart visualization with time range toggles
 *
 * Data: useRisk() → score, level, risk_flags, risk_drivers, factors
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import Svg, { Circle } from "react-native-svg";
import { useRisk } from "@/api/queries/useRisk";
import { useExpenses } from "@/api/queries/useExpenses";
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

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

// ─── Risk Level helpers ───────────────────────────────────────────────────────
function riskColor(score: number) {
  if (score >= 70) return C.error;
  if (score >= 40) return "#F59E0B";
  return C.primary;
}
function riskLabel(level: string) {
  const l = level.toLowerCase();
  if (l === "danger") return "Danger Zone";
  if (l === "concern") return "High Risk";
  if (l === "watch") return "Moderate Risk";
  return "Low Risk";
}

// ─── Bar Chart Component ──────────────────────────────────────────────────────
function BarChart({ data: bars }: { data: number[] }) {
  const maxVal = Math.max(...bars, 1);
  const barRefs = bars.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    barRefs.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: bars[i] / maxVal,
        duration: 800 + i * 100,
        delay: i * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [bars]);

  return (
    <View style={bs.chartWrap}>
      {/* Grid lines */}
      <View style={bs.gridLines}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={bs.gridLine} />
        ))}
      </View>

      {/* Bars */}
      <View style={bs.barsRow}>
        {barRefs.map((anim, i) => {
          const opacity = bars[i] / maxVal;
          return (
            <Animated.View
              key={i}
              style={[
                bs.bar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor:
                    opacity > 0.8
                      ? C.primary
                      : opacity > 0.5
                        ? C.primary + "99"
                        : opacity > 0.3
                          ? C.primary + "66"
                          : C.primary + "33",
                },
                opacity > 0.8 && {
                  ...Platform.select({
                    ios: {
                      shadowColor: C.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                    },
                    android: { elevation: 4 },
                  }),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  chartWrap: {
    height: 200,
    position: "relative",
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  gridLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.onSurface + "10",
  },
  barsRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  bar: {
    flex: 1,
    marginHorizontal: 3,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
export default function RiskBreakdownScreen() {
  const router = useRouter();
  const { data: risk } = useRisk();
  const { data: expenseData } = useExpenses({ page: 1, limit: 50 });

  const riskScore = risk?.risk_score ?? 0;
  const riskLevel_ = risk?.risk_level ?? "Unknown";
  const riskFlags = risk?.risk_flags ?? {};
  const riskDrivers = risk?.risk_drivers ?? [];

  const scorePct = Math.max(Math.min(riskScore, 100), 0);
  const scoreColor = riskColor(scorePct);

  // SVG ring math
  const radius = 110;
  const circum = 2 * Math.PI * radius;
  const dashOffset = circum - (scorePct / 100) * circum;

  // Bar chart: recent expense amounts (last 9)
  const barData = useMemo(() => {
    const expenses =
      (expenseData as any)?.transactions ?? [];
    return expenses.slice(0, 9).map((e: any) => e.amount || 0);
  }, [expenseData]);

  // Time range toggle
  const [range, setRange] = useState("1M");

  // Pulse animation for glow
  const glowAnim = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml
              xml={backArrow.replace(/currentColor/g, C.primary)}
              width={22}
              height={22}
            />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Risk Breakdown</Text>
        </View>
        <View style={s.headerRight}>
          <SvgXml
            xml={`<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>`.replace(
              /currentColor/g,
              C.onSurfaceVar + "99"
            )}
            width={20}
            height={20}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Primary Score Visualization ──────────────────── */}
        <View style={s.scoreSection}>
          {/* Ambient glow */}
          <Animated.View
            style={[
              s.scoreGlow,
              {
                opacity: glowAnim,
                backgroundColor: scoreColor + "30",
              },
            ]}
          />

          <Text style={s.scoreSuperLabel}>TOTAL PORTFOLIO HEALTH</Text>

          {/* Circular gauge */}
          <View style={s.gaugeWrap}>
            <Svg width={256} height={256} viewBox="0 0 256 256">
              {/* Background ring */}
              <Circle
                cx={128}
                cy={128}
                r={radius}
                fill="none"
                stroke={C.onSurface + "0D"}
                strokeWidth={8}
              />
              {/* Score ring */}
              <Circle
                cx={128}
                cy={128}
                r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circum}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 128 128)"
              />
            </Svg>

            {/* Center score */}
            <View style={s.gaugeCenter}>
              <Text style={s.gaugeScore}>{Math.round(scorePct)}</Text>
              <Text style={[s.gaugeLabel, { color: scoreColor }]}>
                {riskLabel(riskLevel_)}
              </Text>
            </View>
          </View>

          <Text style={s.scoreDesc}>
            Your current exposure is within the{" "}
            <Text style={{ color: C.primary, fontStyle: "italic", fontWeight: "600" }}>
              {scorePct < 40 ? "Optimal Threshold" : scorePct < 70 ? "Caution Zone" : "High Risk Zone"}
            </Text>
            {" "}for your spending profile.
          </Text>
        </View>

        {/* ── Risk Factors (Flags) Cards ────────────────────── */}
        {Object.keys(riskFlags).length > 0 && (
          <View style={s.factorsSection}>
            <Text style={s.sectionTitle}>RISK FLAGS</Text>
            <View style={s.factorGrid}>
              {Object.entries(riskFlags).map(([key, active], i) => (
                <View key={key} style={s.factorCard}>
                  <View style={s.factorTop}>
                    <Text style={s.factorIndex}>Flag {String(i + 1).padStart(2, "0")}</Text>
                  </View>
                  <Text style={s.factorName}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <Text style={[s.factorValue, { color: active ? C.error : C.primary }]}>
                    {active ? "Active" : "Clear"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Risk Drivers ─────────────────────────────────── */}
        {riskDrivers.length > 0 && (
          <View style={s.driversSection}>
            <Text style={s.sectionTitle}>RISK DRIVERS</Text>
            {riskDrivers.map((d, i) => (
              <View key={i} style={s.driverRow}>
                <View style={s.driverDot} />
                <View style={s.driverTextBlock}>
                  <Text style={s.driverName}>
                    {d.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Risk Flags ───────────────────────────────────── */}
        {Object.entries(riskFlags).some(([, active]) => active) && (
          <View style={s.flagsSection}>
            <Text style={s.sectionTitle}>ACTIVE FLAGS</Text>
            <View style={s.flagsWrap}>
              {Object.entries(riskFlags)
                .filter(([, active]) => active)
                .map(([flag, ], i) => (
                <View key={i} style={s.flagChip}>
                  <SvgXml
                    xml={`<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>`.replace(
                      /currentColor/g,
                      C.error
                    )}
                    width={14}
                    height={14}
                  />
                  <Text style={s.flagText}>{flag.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Risk History Section ─────────────────────────── */}
        <View style={s.historySection}>
          <View style={s.historyHeader}>
            <View>
              <Text style={s.historySectionTitle}>Risk History</Text>
              <Text style={s.historySub}>
                Spend volatility and stress-test performance.
              </Text>
            </View>
            <View style={s.historyToggles}>
              {["1M", "3M", "YTD"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    s.rangeBtn,
                    range === r && s.rangeBtnActive,
                  ]}
                  onPress={() => setRange(r)}
                >
                  <Text
                    style={[
                      s.rangeBtnText,
                      range === r && s.rangeBtnTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar Chart */}
          {barData.length > 0 ? (
            <BarChart data={barData} />
          ) : (
            <View style={s.emptyChart}>
              <Text style={s.emptyChartText}>
                Not enough data for chart visualization.
              </Text>
            </View>
          )}

          {/* X-axis labels */}
          <View style={s.xAxis}>
            <Text style={s.xLabel}>Recent</Text>
            <Text style={s.xLabel}>Older</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.primary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", gap: 14 },

  // ── Score Section ──────────────────────────────────────────────────────────
  scoreSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  scoreGlow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    top: "50%",
    left: "50%",
    marginLeft: -200,
    marginTop: -200,
  },
  scoreSuperLabel: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 4,
    marginBottom: 20,
    zIndex: 1,
  },
  gaugeWrap: {
    width: 256,
    height: 256,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    zIndex: 1,
  },
  gaugeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeScore: {
    color: C.onSurface,
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: -3,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: -2,
  },
  scoreDesc: {
    color: C.onSurfaceVar,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    zIndex: 1,
  },

  // ── Factors ────────────────────────────────────────────────────────────────
  factorsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 14,
  },
  factorGrid: {
    gap: 12,
  },
  factorCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 22,
  },
  factorTop: {
    marginBottom: 10,
  },
  factorIndex: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  factorName: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  factorValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 14,
  },
  factorBar: {
    height: 4,
    backgroundColor: C.surfaceHighest,
    borderRadius: 2,
    overflow: "hidden",
  },
  factorBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // ── Drivers ────────────────────────────────────────────────────────────────
  driversSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "15",
  },
  driverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.error,
  },
  driverTextBlock: { flex: 1 },
  driverName: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  driverImpact: {
    color: C.outline,
    fontSize: 12,
  },

  // ── Flags ──────────────────────────────────────────────────────────────────
  flagsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  flagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: C.error + "15",
    borderWidth: 1,
    borderColor: C.error + "30",
  },
  flagText: {
    color: C.error,
    fontSize: 12,
    fontWeight: "600",
  },

  // ── History Section ────────────────────────────────────────────────────────
  historySection: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  historySectionTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  historySub: {
    color: C.onSurfaceVar,
    fontSize: 12,
  },
  historyToggles: {
    flexDirection: "row",
    gap: 6,
  },
  rangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  rangeBtnActive: {
    backgroundColor: C.surfaceHighest,
  },
  rangeBtnText: {
    color: C.onSurfaceVar,
    fontSize: 11,
    fontWeight: "600",
  },
  rangeBtnTextActive: {
    color: C.primary,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  xLabel: {
    color: C.onSurfaceVar + "66",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  emptyChart: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: {
    color: C.outline,
    fontSize: 13,
  },
});
