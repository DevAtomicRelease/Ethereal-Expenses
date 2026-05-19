/**
 * Intelligence History Screen — Premium activity log from Ethereal engines.
 *
 * Layout (from HTML mockup):
 *  1. Header: ← back + "Intelligence History"
 *  2. System Health summary card (data maturity, txn count, stale status)
 *  3. Activity Log timeline — events aggregated from:
 *       - useAnomalies()     → anomaly detections
 *       - useInsights()      → AI insights
 *       - useMomentum()      → momentum shifts
 *       - useIdentity()      → identity/behavior signals
 *       - useRisk()          → risk flag changes
 *  4. "End of Recent History" footer
 */
import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useAnomalies } from "@/api/queries/useAnomalies";
import { useInsights } from "@/api/queries/useInsights";
import { useRisk } from "@/api/queries/useRisk";
import { useMomentum } from "@/api/queries/useMomentum";
import { useIdentity } from "@/api/queries/useIdentity";
import { useDataMaturity } from "@/hooks/useDataMaturity";
import { relativeTime } from "@/utils/dates";

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
const warningIcon = `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>`;
const psychIcon = `<svg viewBox="0 0 24 24"><path d="M13 8.57a1.43 1.43 0 100-2.86 1.43 1.43 0 000 2.86zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2a.5.5 0 00.4.8h1.5v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7z" fill="currentColor"/></svg>`;
const monitorIcon = `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/></svg>`;
const shieldIcon = `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`;
const trendIcon = `<svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="currentColor"/></svg>`;
const analyticsIcon = `<svg viewBox="0 0 24 24"><path d="M7 5h2V3H7v2zm0 8h2v-2H7v2zm0 8h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm-8 0h2v-2H3v2zm0-4h2v-2H3v2zm0-4h2v-2H3v2zm0-4h2V5H3v2zm0-4h2V1H3v2zm4 8h2V9H7v2zm8 8h2v-2h-2v2zm0-4h2v-2h-2v2zm4 0h2v-2h-2v2zm0 4h2v-2h-2v2zm0-8h2v-2h-2v2zm0-4h2V5h-2v2zm0-4V1h-2v2h2zm-4 0h2V1h-2v2zm0 16h2v-2h-2v2zm0-8h2V9h-2v2zm-4-4h2V5h-2v2zm0 4h2V9h-2v2zm0 4h2v-2h-2v2z" fill="currentColor"/></svg>`;
const boltIcon = `<svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" fill="currentColor"/></svg>`;
const fingerprintIcon = `<svg viewBox="0 0 24 24"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28z" fill="currentColor"/></svg>`;

// ─── Event type definitions ───────────────────────────────────────────────────
interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  icon: string;
  timestamp?: string;
  time: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function IntelligenceHistoryScreen() {
  const router = useRouter();
  const { maturity, txnCount, isStale, progressPct, isMature } = useDataMaturity();
  const { data: anomalyData } = useAnomalies();
  const { data: insightData } = useInsights();
  const { data: riskData } = useRisk();
  const { data: momentumData } = useMomentum();
  const { data: identityData } = useIdentity();

  // ── Build timeline events from backend data ────────────────────────────────
  const events: TimelineEvent[] = useMemo(() => {
    const items: TimelineEvent[] = [];

    // 1. Anomalies
    const anomalies = anomalyData?.anomalies ?? [];
    anomalies.forEach((a: any, i: number) => {
      items.push({
        id: `anomaly-${i}`,
        title: `${(a.anomaly_type || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} Detected`,
        description: a.details?.amount
          ? `Anomalous transaction of ₹${a.details.amount.toLocaleString()} flagged with ${a.severity || "medium"} severity.`
          : `${a.severity || "Medium"} severity anomaly detected in spending patterns.`,
        category: "Anomalies",
        categoryColor: C.error,
        categoryBg: C.errorContainer + "1A",
        icon: warningIcon,
        timestamp: undefined,
        time: a.transaction_id ? `Txn: ${a.transaction_id.slice(0, 6)}…` : "Recently",
      });
    });

    // 2. Insights — from category breakdown (top spending categories)
    const catBreakdown = (insightData as any)?.category_breakdown ?? {};
    const topCats = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3);
    if (topCats.length > 0) {
      items.push({
        id: "insight-top-categories",
        title: "Top Spending Categories",
        description: topCats
          .map(([cat, pct]) => `${cat.replace(/_/g, " ")}: ${Math.round((pct as number) * 100)}%`)
          .join(", "),
        category: "Insights",
        categoryColor: C.primary,
        categoryBg: C.primary + "15",
        icon: psychIcon,
        time: "Active",
      });
    }

    // 3. Risk flags — risk_flags is Record<string, boolean>, not array
    const riskFlags = riskData?.risk_flags ?? {};
    Object.entries(riskFlags)
      .filter(([, active]) => active)
      .forEach(([flag, ], i) => {
        items.push({
          id: `risk-${i}`,
          title: "Risk Flag Raised",
          description: flag.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          category: "Risk",
          categoryColor: C.error,
          categoryBg: C.errorContainer + "1A",
          icon: shieldIcon,
          time: "Active",
        });
      });

    // 4. Momentum signal
    if (momentumData?.direction) {
      items.push({
        id: "momentum-signal",
        title: `Momentum ${momentumData.direction.charAt(0).toUpperCase() + momentumData.direction.slice(1)}`,
        description: `Spending acceleration: ${(momentumData.acceleration ?? 0).toFixed(1)}%. ` +
          `Category drift is ${momentumData.direction}.`,
        category: "Behavior",
        categoryColor: C.secondary,
        categoryBg: C.secondaryContainer + "33",
        icon: trendIcon,
        time: "Current",
      });
    }

    // 5. Identity signal — identity data is flat, not nested
    if (identityData?.primary_identity && identityData.primary_identity !== "unknown") {
      items.push({
        id: "identity-signal",
        title: "Identity Profile Updated",
        description: `Confidence: ${Math.round((identityData.identity_confidence ?? 0) * 100)}% · ` +
          `Self-control: ${Math.round((identityData.self_control_score ?? 0) * 100)}% · ` +
          `Stability: ${(identityData.identity_stability ?? "unknown")}`,
        category: "Identity",
        categoryColor: C.primary,
        categoryBg: C.primary + "15",
        icon: fingerprintIcon,
        time: "Active",
      });
    }

    // 6. System / memory status
    items.push({
      id: "system-status",
      title: isStale ? "Data Refresh Needed" : "Everything Up to Date",
      description: isStale
        ? "Your spending data needs refreshing for accurate insights."
        : `Tracking ${txnCount} transactions. Data maturity: ${maturity}.`,
      category: "System",
      categoryColor: C.primary,
      categoryBg: C.primary + "15",
      icon: monitorIcon,
      time: "Now",
    });

    return items;
  }, [anomalyData, insightData, riskData, momentumData, identityData, txnCount, maturity, isStale]);

  // Maturity phase label
  const phaseLabel = isMature
    ? "Optimal Phase"
    : maturity === "early"
      ? "Early Phase"
      : "Bootstrap Phase";

  const cognitiveLoad = Math.min(Math.round(progressPct * 0.3 + (isStale ? 40 : 0)), 100);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── System Health Card ────────────────────────────── */}
        <View style={s.healthCard}>
          <View style={s.healthTop}>
            <View>
              <Text style={s.healthLabel}>DATA STATUS</Text>
              <Text style={s.healthTitle}>{phaseLabel}</Text>
            </View>
            <View style={s.healthIconWrap}>
              <SvgXml
                xml={analyticsIcon.replace(/currentColor/g, C.primary)}
                width={22}
                height={22}
              />
            </View>
          </View>

          <View style={s.healthBottom}>
            <View style={s.healthBarBlock}>
              <View style={s.healthBarLabelRow}>
                <Text style={s.healthBarLabel}>DATA COMPLETENESS</Text>
                <Text style={s.healthBarValue}>{cognitiveLoad}%</Text>
              </View>
              <View style={s.healthBarTrack}>
                <View style={[s.healthBarFill, { width: `${cognitiveLoad}%` as any }]} />
              </View>
            </View>
            <View style={s.activeBadge}>
              <SvgXml
                xml={boltIcon.replace(/currentColor/g, C.primary)}
                width={13}
                height={13}
              />
              <Text style={s.activeBadgeText}>
                {isStale ? "STALE" : "ACTIVE"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Activity Log ─────────────────────────────────── */}
        <View style={s.logSection}>
          <View style={s.logHeader}>
            <Text style={s.logTitle}>Activity Log</Text>
            <Text style={s.logSync}>LIVE SYNC</Text>
          </View>

          <View style={s.timeline}>
            {/* Vertical connector line */}
            <View style={s.timelineLine} />

            {events.map((event, i) => (
              <View key={event.id} style={s.eventRow}>
                {/* Dot / Icon */}
                <View style={s.eventDotOuter}>
                  <View style={s.eventDot}>
                    <SvgXml
                      xml={event.icon.replace(/currentColor/g, C.primary)}
                      width={18}
                      height={18}
                    />
                  </View>
                </View>

                {/* Content */}
                <View style={s.eventContent}>
                  <View style={s.eventTitleRow}>
                    <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
                    <Text style={s.eventTime}>{event.time}</Text>
                  </View>
                  <Text style={s.eventDesc} numberOfLines={2}>
                    {event.description}
                  </Text>
                  <View style={s.eventBadgeWrap}>
                    <View
                      style={[
                        s.eventBadge,
                        { backgroundColor: event.categoryBg },
                      ]}
                    >
                      <Text
                        style={[
                          s.eventBadgeText,
                          { color: event.categoryColor },
                        ]}
                      >
                        {event.category}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── End footer ───────────────────────────────────── */}
        <View style={s.endFooter}>
          <Text style={s.endText}>END OF RECENT HISTORY</Text>
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
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.primary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // ── Health Card ────────────────────────────────────────────────────────────
  healthCard: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 28,
    padding: 24,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  healthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  healthLabel: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  healthTitle: {
    color: C.onSurface,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
  },
  healthIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  healthBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  healthBarBlock: { flex: 1 },
  healthBarLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  healthBarLabel: {
    color: C.onSurfaceVar,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  healthBarValue: {
    color: C.onSurfaceVar,
    fontSize: 9,
    fontWeight: "600",
  },
  healthBarTrack: {
    height: 4,
    backgroundColor: C.surfaceHighest,
    borderRadius: 2,
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary + "0D",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // ── Log Section ────────────────────────────────────────────────────────────
  logSection: {
    paddingHorizontal: 20,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  logTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logSync: {
    color: C.primary + "99",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // ── Timeline ───────────────────────────────────────────────────────────────
  timeline: {
    position: "relative",
    paddingLeft: 4,
  },
  timelineLine: {
    position: "absolute",
    left: 23, // center of the 40px dot
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: C.outlineVar + "33",
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
    marginBottom: 40,
  },
  eventDotOuter: {
    zIndex: 10,
  },
  eventDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.bg,
  },
  eventContent: {
    flex: 1,
    paddingTop: 2,
  },
  eventTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 4,
  },
  eventTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 20,
  },
  eventTime: {
    color: C.onSurfaceVar + "99",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  eventDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  eventBadgeWrap: {
    flexDirection: "row",
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  eventBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── End Footer ─────────────────────────────────────────────────────────────
  endFooter: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
    backgroundColor: C.surface + "4D",
    alignItems: "center",
  },
  endText: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
  },
});
