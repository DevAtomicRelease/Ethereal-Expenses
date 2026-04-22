/**
 * Analytics detail screen (within Insights tab).
 * Full analytics page with Lifestyle Radar, Risk History, and Category Intelligence.
 * Back-nav returns to AI Hub.
 *
 * Backend hooks:
 *  - useInsights()      → GET /insights  (category_breakdown)
 *  - useIntelligence()  → GET /intelligence (lifestyle signals)
 *  - useRisk()          → GET /risk (risk_score, risk_level, risk_drivers)
 */
import React, { useState, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import Svg, {
  Polygon,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useInsights } from "@/api/queries/useInsights";
import { useIntelligence } from "@/api/queries/useIntelligence";
import { useRisk } from "@/api/queries/useRisk";
import { useExpenses } from "@/api/queries/useExpenses";

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
  errorDim: "#93000A",
  secondary: "#C0CAAF",
  safe: "#10B981",
  watch: "#F59E0B",
  concern: "#F97316",
  danger: "#EF4444",
} as const;

const backArrow = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

const RANGES = ["7D", "30D", "90D"] as const;

// ─── Radar chart config ───────────────────────────────────────────────────────
const RADAR_AXES = ["Social", "Nightlife", "Health", "Commute", "Weekend", "Vault"];
const RADAR_SIZE = Math.min(Dimensions.get("window").width - 72, 340);
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = RADAR_SIZE * 0.38;

function polarPt(cx: number, cy: number, r: number, idx: number, total: number) {
  const angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// ─── Map lifestyle signals → radar values ─────────────────────────────────────
function mapLifestyleToRadar(intel: any): number[] {
  if (!intel || intel.status === "insufficient_data") {
    return [0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
  }

  const signals: string[] =
    intel.lifestyle_signals ??
    intel.compressed_signals?.lifestyle_signals ??
    [];
  const signalStr = signals.join(" ").toLowerCase();

  const scoreFromSignal = (keywords: string[], base = 0.15): number => {
    for (const kw of keywords) {
      if (
        signalStr.includes(kw + "_heavy") ||
        signalStr.includes(kw + "_dedicated") ||
        signalStr.includes(kw + "_very_frequent") ||
        signalStr.includes(kw + "_strong")
      )
        return 0.95;
      if (
        signalStr.includes(kw + "_regular") ||
        signalStr.includes(kw + "_frequent") ||
        signalStr.includes(kw + "_moderate")
      )
        return 0.7;
      if (
        signalStr.includes(kw + "_occasional") ||
        signalStr.includes(kw + "_slight") ||
        signalStr.includes(kw + "_light")
      )
        return 0.45;
    }
    return base;
  };

  return [
    scoreFromSignal(["social"]),
    scoreFromSignal(["nightlife"]),
    scoreFromSignal(["health"]),
    scoreFromSignal(["commute"]),
    scoreFromSignal(["weekend_bias"]),
    scoreFromSignal(["subscriptions"]),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDetailScreen() {
  const router = useRouter();
  const [range, setRange] = useState<(typeof RANGES)[number]>("30D");
  const { data: insights } = useInsights();
  const { data: intel } = useIntelligence();
  const { data: risk } = useRisk();
  const { data: expenseData } = useExpenses({ page: 1, limit: 500 });

  // Parse range to days
  const rangeDays = range === "7D" ? 7 : range === "30D" ? 30 : 90;

  // Filter expenses by selected range
  const filteredExpenses = useMemo(() => {
    const all = (expenseData as any)?.transactions ?? (expenseData as any)?.expenses ?? [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return all.filter((e: any) => new Date(e.timestamp) >= cutoff);
  }, [expenseData, rangeDays]);

  // Daily spending trend (for bar chart)
  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    // Initialize all days to 0
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    filteredExpenses.forEach((e: any) => {
      const key = new Date(e.timestamp).toISOString().slice(0, 10);
      if (map[key] !== undefined) map[key] += e.amount || 0;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [filteredExpenses, rangeDays]);

  const maxDaily = Math.max(...dailyTrend.map((d) => d.amount), 1);
  const totalRangeSpend = filteredExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  // Category breakdown from filtered expenses
  const filteredBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e: any) => {
      const cat = e.category || "misc";
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return map;
  }, [filteredExpenses]);

  const sortedCats = Object.entries(filteredBreakdown).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  );
  const totalSpend = sortedCats.reduce((sum, [, v]) => sum + (v as number), 0);

  // Radar data
  const radarValues = useMemo(() => mapLifestyleToRadar(intel), [intel]);
  const radarPts = radarValues.map((v, i) =>
    polarPt(RADAR_CX, RADAR_CY, RADAR_R * v, i, RADAR_AXES.length)
  );
  const radarStr = radarPts.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.33, 0.66, 1.0];

  // Risk
  const riskScore = risk?.risk_score ?? 0;
  const riskLevel = risk?.risk_level ?? "safe";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml
              xml={backArrow.replace(/currentColor/g, C.onSurface)}
              width={22}
              height={22}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>Insights</Text>
            <Text style={s.subheading}>
              Your lifestyle volatility and capital risk overview.
            </Text>
          </View>
        </View>

        {/* ── Range Selector ──────────────────────────────────── */}
        <View style={s.rangeWrap}>
          <View style={s.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRange(r)}
                style={[s.rangeBtn, range === r && s.rangeBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.rangeText, range === r && s.rangeTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Spending Trend Chart ──────────────────────────────── */}
        <View style={s.trendCard}>
          <View style={s.trendHeaderRow}>
            <View>
              <Text style={s.trendTitle}>Spending Trend</Text>
              <Text style={s.trendSub}>{range} · ₹{totalRangeSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={s.trendAvgBadge}>
              <Text style={s.trendAvgText}>
                AVG ₹{(totalRangeSpend / Math.max(rangeDays, 1)).toFixed(0)}/day
              </Text>
            </View>
          </View>
          <View style={s.trendChartWrap}>
            {/* Show subset of bars for readability */}
            {(() => {
              const step = rangeDays > 30 ? 3 : 1;
              const bars = [];
              for (let i = 0; i < dailyTrend.length; i += step) {
                const chunk = dailyTrend.slice(i, i + step);
                const amt = chunk.reduce((s, d) => s + d.amount, 0);
                const h = maxDaily > 0 ? (amt / (maxDaily * step)) * 100 : 0;
                bars.push(
                  <View
                    key={i}
                    style={[
                      s.trendBar,
                      {
                        height: `${Math.max(h, 3)}%` as any,
                        backgroundColor: amt > 0 ? C.primary : C.surfaceHighest,
                        opacity: amt > 0 ? 0.85 : 0.3,
                      },
                    ]}
                  />
                );
              }
              return bars;
            })()}
          </View>
          {/* X-axis labels */}
          <View style={s.trendXAxis}>
            <Text style={s.trendXLabel}>{dailyTrend[0]?.date.slice(5) ?? ""}</Text>
            <Text style={s.trendXLabel}>{dailyTrend[Math.floor(dailyTrend.length / 2)]?.date.slice(5) ?? ""}</Text>
            <Text style={s.trendXLabel}>{dailyTrend[dailyTrend.length - 1]?.date.slice(5) ?? ""}</Text>
          </View>
        </View>

        {/* ── Lifestyle Radar Card ────────────────────────────── */}
        <View style={s.radarCard}>
          <View style={s.radarHeaderBlock}>
            <Text style={s.radarTitle}>Lifestyle Radar</Text>
            <View style={s.radarBadgeRow}>
              <View style={s.radarDot} />
              <Text style={s.radarBadge}>HIGH PRECISION MODEL</Text>
            </View>
          </View>

          {/* SVG Radar */}
          <View style={s.radarContainer}>
            <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
              {/* Grid polygons */}
              {gridLevels.map((level) => {
                const pts = RADAR_AXES.map((_, i) =>
                  polarPt(
                    RADAR_CX,
                    RADAR_CY,
                    RADAR_R * level,
                    i,
                    RADAR_AXES.length
                  )
                );
                return (
                  <Polygon
                    key={level}
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={C.outlineVar}
                    strokeWidth={0.5}
                    strokeDasharray="4,4"
                    opacity={0.5}
                  />
                );
              })}

              {/* Axis lines */}
              {RADAR_AXES.map((_, i) => {
                const end = polarPt(
                  RADAR_CX,
                  RADAR_CY,
                  RADAR_R,
                  i,
                  RADAR_AXES.length
                );
                return (
                  <Line
                    key={i}
                    x1={RADAR_CX}
                    y1={RADAR_CY}
                    x2={end.x}
                    y2={end.y}
                    stroke={C.outlineVar}
                    strokeWidth={0.5}
                    opacity={0.3}
                  />
                );
              })}

              {/* Gradient definition */}
              <Defs>
                <LinearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={C.primary} stopOpacity={0.4} />
                  <Stop
                    offset="1"
                    stopColor={C.primaryDim}
                    stopOpacity={0.1}
                  />
                </LinearGradient>
              </Defs>

              {/* Data polygon with gradient fill */}
              <Polygon
                points={radarStr}
                fill="url(#radarGrad)"
                stroke={C.primary}
                strokeWidth={2}
                opacity={0.85}
              />

              {/* Data dots at each vertex */}
              {radarPts.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={C.primary}
                  opacity={0.9}
                />
              ))}

              {/* Axis labels */}
              {RADAR_AXES.map((label, i) => {
                const p = polarPt(
                  RADAR_CX,
                  RADAR_CY,
                  RADAR_R + 22,
                  i,
                  RADAR_AXES.length
                );
                return (
                  <SvgText
                    key={i}
                    x={p.x}
                    y={p.y + 3}
                    fill={C.onSurfaceVar}
                    fontSize={9}
                    fontWeight="700"
                    textAnchor="middle"
                    letterSpacing={1}
                  >
                    {label.toUpperCase()}
                  </SvgText>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* ── Risk History Card ────────────────────────────────── */}
        <View style={s.riskCard}>
          <View style={s.riskHeader}>
            <Text style={s.riskTitle}>Risk History</Text>
            <SvgXml
              xml={`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="${C.onSurfaceVar}33"/></svg>`}
              width={24}
              height={24}
            />
          </View>

          {riskScore > 0 ? (
            <View style={s.riskContent}>
              {/* Score display */}
              <View style={s.riskScoreRow}>
                <Text
                  style={[
                    s.riskScoreValue,
                    riskScore > 75 && { color: C.danger },
                    riskScore > 50 && riskScore <= 75 && { color: C.concern },
                    riskScore > 25 && riskScore <= 50 && { color: C.watch },
                    riskScore <= 25 && { color: C.safe },
                  ]}
                >
                  {Math.round(riskScore)}
                </Text>
                <View>
                  <Text style={s.riskLevelText}>
                    {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}{" "}
                    Risk
                  </Text>
                  <Text style={s.riskTrend}>
                    {risk?.risk_trend
                      ? `Trend: ${risk.risk_trend}`
                      : "No trend data"}
                  </Text>
                </View>
              </View>

              {/* Risk drivers */}
              {risk?.risk_drivers && risk.risk_drivers.length > 0 && (
                <View style={s.driversWrap}>
                  {(Array.isArray(risk.risk_drivers)
                    ? risk.risk_drivers
                    : []
                  ).map((d: any, i: number) => {
                    const label =
                      typeof d === "string" ? d : d?.driver ?? "unknown";
                    return (
                      <View key={i} style={s.driverChip}>
                        <Text style={s.driverText}>
                          {label.replace(/_/g, " ")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <SvgXml
                  xml={`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="${C.onSurfaceVar}55"/></svg>`}
                  width={32}
                  height={32}
                />
              </View>
              <Text style={s.emptyText}>
                Need 2+ data points for risk history
              </Text>
            </View>
          )}
        </View>

        {/* ── Category Intelligence ────────────────────────────── */}
        <View style={s.catSection}>
          <View style={s.catHeaderRow}>
            <Text style={s.catTitle}>Category Intelligence</Text>
          </View>

          {sortedCats.length > 0 ? (
            <View style={s.catCard}>
              {sortedCats.map(([cat, amount], i) => {
                const pct =
                  totalSpend > 0
                    ? ((amount as number) / totalSpend) * 100
                    : 0;
                return (
                  <View
                    key={cat}
                    style={[
                      s.catRow,
                      i < sortedCats.length - 1 && s.catRowBorder,
                    ]}
                  >
                    <View style={s.catInfo}>
                      <Text style={s.catName}>
                        {cat.replace(/_/g, " ")}
                      </Text>
                      <Text style={s.catAmount}>
                        ₹{(amount as number).toLocaleString()}
                      </Text>
                    </View>
                    <View style={s.barBg}>
                      <View
                        style={[
                          s.barFill,
                          { width: `${Math.max(pct, 3)}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={s.catPct}>{pct.toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={s.catEmptyCard}>
              <View style={s.catEmptyIcon}>
                <SvgXml
                  xml={`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="${C.primary}66"/></svg>`}
                  width={32}
                  height={32}
                />
              </View>
              <Text style={s.catEmptyTitle}>No category data yet</Text>
              <Text style={s.catEmptySub}>
                Add transactions to generate category-level intelligence and
                volatility metrics.
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 14,
  },
  backBtn: { padding: 6, marginTop: 4 },
  heading: {
    color: C.onSurface,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  subheading: {
    color: C.onSurfaceVar + "99",
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Range Selector ─────────────────────────────────────────────────────────
  rangeWrap: {
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  rangeRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  rangeBtn: {
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  rangeBtnActive: {
    backgroundColor: C.primary + "1A",
  },
  rangeText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "600",
  },
  rangeTextActive: {
    color: C.primary,
  },

  // ── Radar Card ─────────────────────────────────────────────────────────────
  radarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 28,
    padding: 24,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  radarHeaderBlock: {
    marginBottom: 8,
  },
  radarTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  radarBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  radarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  radarBadge: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  // ── Risk History Card ──────────────────────────────────────────────────────
  riskCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 28,
    padding: 24,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  riskTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  riskContent: {},
  riskScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: "800",
    color: C.primary,
  },
  riskLevelText: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  riskTrend: {
    color: C.onSurfaceVar + "99",
    fontSize: 12,
  },
  driversWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  driverChip: {
    backgroundColor: C.error + "1A",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  driverText: {
    color: C.error,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    opacity: 0.5,
  },
  emptyText: {
    color: C.onSurfaceVar + "99",
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Category Intelligence ──────────────────────────────────────────────────
  catSection: {
    marginHorizontal: 20,
  },
  catHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  catTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  catCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
  },
  catRow: {
    paddingVertical: 14,
  },
  catRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "15",
  },
  catInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  catName: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  catAmount: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "500",
  },
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
  catPct: {
    color: C.onSurfaceVar + "80",
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Category empty state ───────────────────────────────────────────────────
  catEmptyCard: {
    borderRadius: 24,
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
    alignItems: "center",
  },
  catEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  catEmptyTitle: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  catEmptySub: {
    color: C.onSurfaceVar + "80",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },

  // ── Spending Trend Chart ──────────────────────────────────────────────────
  trendCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 28,
    padding: 24,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
  },
  trendHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  trendTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  trendSub: {
    color: C.onSurfaceVar + "99",
    fontSize: 12,
    marginTop: 3,
  },
  trendAvgBadge: {
    backgroundColor: C.primary + "1A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  trendAvgText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  trendChartWrap: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  trendBar: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 3,
  },
  trendXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  trendXLabel: {
    color: C.onSurfaceVar + "66",
    fontSize: 9,
    fontWeight: "600",
  },
});
