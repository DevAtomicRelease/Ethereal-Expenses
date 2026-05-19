/**
 * Ethereal Expense Dashboard / Home Screen
 * ────────────────────────────
 * Bento-style dark dashboard that mirrors the Ethereal Expense design.
 *
 * Data sources (all live from backend):
 *  – useExpenses()      → recent transactions list + total spend calculation
 *  – useIntelligence()  → narrative, risk_score, risk_level, momentum, projection
 *  – useInsights()      → weekly_averages, category_breakdown
 *  – useThresholds()    → daily / weekly / monthly budgets
 */

import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import OfflineBanner from "@/components/ui/OfflineBanner";

// ─── Lucide icons ─────────────────────────────────────────────────────────────
import {
  TrendingUp,
  TrendingDown,
  Brain,
  ChevronRight,
  ShoppingCart,
  Utensils,
  Car,
  Plane,
  Smartphone,
  Coffee,
  HeartPulse,
  Shirt,
  Receipt,
  CircleDollarSign,
  Zap,
  Plus,
} from "lucide-react-native";

// ─── Hooks / queries ──────────────────────────────────────────────────────────
import { useExpenses } from "@/api/queries/useExpenses";
import { useIntelligence } from "@/api/queries/useIntelligence";
import { useInsights } from "@/api/queries/useInsights";
import { useThresholds } from "@/api/queries/useThresholds";

// ─── Utils ────────────────────────────────────────────────────────────────────
import { formatINR, formatINRFull } from "@/utils/currency";
import { relativeTime } from "@/utils/dates";
import { getCategoryColor, getCategoryLabel } from "@/utils/categories";

// ─── Types ────────────────────────────────────────────────────────────────────
import type { ExpenseResponse, IntelligenceResponse, InsufficientDataResponse } from "@/types/api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  primaryDim: "#969359",
  onPrimary: "#1d1d00",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#48473B",
  error: "#FFB4AB",
  success: "#A8D8A8",
} as const;

// ─── Category → Lucide icon map ───────────────────────────────────────────────
function CategoryIcon({ cat, color, size = 22 }: { cat: string; color: string; size?: number }) {
  const props = { color, size, strokeWidth: 2 };
  const map: Record<string, JSX.Element> = {
    food:          <Utensils {...props} />,
    groceries:     <ShoppingCart {...props} />,
    dining_out:    <Utensils {...props} />,
    transport:     <Car {...props} />,
    travel:        <Plane {...props} />,
    electronics:   <Smartphone {...props} />,
    coffee:        <Coffee {...props} />,
    health:        <HeartPulse {...props} />,
    clothing:      <Shirt {...props} />,
    subscriptions: <Zap {...props} />,
    fuel:          <Car {...props} />,
    shopping:      <ShoppingCart {...props} />,
  };
  return map[cat] ?? <CircleDollarSign {...props} />;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function isInsufficient(data: any): data is InsufficientDataResponse {
  return data?.status === "insufficient_data";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const email: string | null = useSelector((s: any) => s.auth?.email ?? null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: expenseData, isLoading: expLoading, isError: expError, refetch: refetchExpenses } = useExpenses({ page: 1, limit: 500 });
  const { data: intelData, isLoading: intelLoading, refetch: refetchIntel } = useIntelligence();
  const { data: insightData, refetch: refetchInsights } = useInsights();
  const { data: thresholds, refetch: refetchThresholds } = useThresholds();

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchExpenses(),
      refetchIntel(),
      refetchInsights(),
      refetchThresholds(),
    ]);
    setRefreshing(false);
  }, [refetchExpenses, refetchIntel, refetchInsights, refetchThresholds]);

  const expenses: ExpenseResponse[] = useMemo(
    () => (expenseData as any)?.transactions ?? [],
    [expenseData]
  );

  // ── Derived values from backend ────────────────────────────────────────────
  const totalSpend: number = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Monthly spend (current calendar month only)
  const { monthlySpent, daysElapsed, daysInMonth } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const spent = expenses
      .filter((e) => new Date(e.timestamp) >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0);
    const elapsed = now.getDate();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return { monthlySpent: spent, daysElapsed: elapsed, daysInMonth: totalDays };
  }, [expenses]);

  // End-of-month forecast
  const dailyRate = daysElapsed > 0 ? monthlySpent / daysElapsed : 0;
  const forecast = dailyRate * daysInMonth;
  const remainingDays = daysInMonth - daysElapsed;
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });
  const forecastVsBudget = monthlyBudget > 0 ? ((forecast - monthlyBudget) / monthlyBudget) * 100 : 0;

  const intel = !isInsufficient(intelData) ? (intelData as IntelligenceResponse) : null;
  const signals = intel?.compressed_signals ?? null;

  // Weekly spend from insights.weekly_averages (sum of all category weekday avgs × 7) or fallback
  const weeklySpend: number = useMemo(() => {
    if (insightData?.weekly_averages) {
      return Object.values(insightData.weekly_averages).reduce((s, v) => s + v, 0) * 7;
    }
    // Fallback: sum expenses from last 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return expenses
      .filter((e) => new Date(e.timestamp).getTime() > cutoff)
      .reduce((s, e) => s + e.amount, 0);
  }, [insightData, expenses]);

  // Momentum
  const momentumDir = signals?.momentum_direction ?? "stable";
  const momentumUp = momentumDir === "accelerating" || momentumDir === "accelerating_fast";

  // Risk pill color
  const riskLevel = (signals?.risk_level ?? "").toLowerCase();
  const riskColor =
    riskLevel === "danger" || riskLevel === "concern" ? C.error :
    riskLevel === "watch" ? "#F59E0B" :
    C.primary;

  // Avatar initials
  const initials = email ? email.slice(0, 2).toUpperCase() : "BE";

  // Recent 5 expenses for the list
  const recentExpenses = expenses.slice(0, 5);

  // Monthly budget progress
  const monthlyBudget = thresholds?.monthly ?? 0;
  const budgetProgress = monthlyBudget > 0 ? Math.min(monthlySpent / monthlyBudget, 1) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <OfflineBanner />
      {/* ── Top App Bar ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Avatar circle with email initials — taps to profile */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile/user-profile" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push("/(tabs)/insights")}
          accessibilityLabel="View insights"
        >
          <Brain color={C.primary} size={22} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
            progressBackgroundColor={C.surface}
          />
        }
      >
        {/* ── Monthly Spend Card ────────────────────────────────────── */}
          <View style={[styles.bentoCard, styles.spendCard, { marginBottom: 14 }]}>
            <View style={styles.spendGlow} />
            <Text style={styles.spendLabel}>{monthName.toUpperCase()} SPEND</Text>
            {expLoading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />
            ) : (
              <Text style={styles.spendAmount}>{formatINR(monthlySpent)}</Text>
            )}
            <View style={styles.spendBadgeRow}>
              {momentumUp
                ? <TrendingUp color={C.primary} size={14} strokeWidth={2.5} />
                : <TrendingDown color={C.error} size={14} strokeWidth={2.5} />
              }
              <Text style={[styles.spendBadgeText, !momentumUp && { color: C.error }]}>
                {momentumDir
                  ? `${momentumDir.replace(/_/g, ' ')} momentum`
                  : "Loading…"}
              </Text>
            </View>
          </View>

        {/* ── End-of-Month Forecast Card ─────────────────────────────── */}
        {!expLoading && monthlySpent > 0 && (
          <View style={[styles.bentoCard, styles.forecastCard, { marginBottom: 14 }]}>
            <View style={styles.forecastHeader}>
              <Text style={styles.forecastLabel}>📈 END-OF-MONTH FORECAST</Text>
              <Text style={styles.forecastDays}>{remainingDays}d left</Text>
            </View>
            <Text style={styles.forecastAmount}>{formatINR(Math.round(forecast))}</Text>
            <Text style={styles.forecastSub}>
              Based on {formatINR(Math.round(dailyRate))}/day avg · {daysElapsed} days tracked
            </Text>
            {monthlyBudget > 0 && (
              <View style={styles.forecastBudgetRow}>
                <View style={[styles.forecastDot, { backgroundColor: forecastVsBudget > 0 ? C.error : C.success }]} />
                <Text style={[styles.forecastBudgetText, { color: forecastVsBudget > 0 ? C.error : C.success }]}>
                  {forecastVsBudget > 0
                    ? `${Math.round(forecastVsBudget)}% over budget`
                    : `${Math.abs(Math.round(forecastVsBudget))}% under budget`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Weekly Report Card (full width, below) ───────────────────── */}
          {/* AI Insight / Weekly Card */}
          <View style={[styles.bentoCard, styles.intelCard, { marginBottom: 14, flexDirection: "column" }]}>
            <Brain color={C.primary} size={20} strokeWidth={2} />
            <Text style={styles.intelTitle}>Weekly Report</Text>
            {intelLoading ? (
              <ActivityIndicator color={C.primary} size="small" style={{ marginTop: 8 }} />
            ) : isInsufficient(intelData) ? (
              <Text style={styles.intelBody}>
                Add {(intelData as InsufficientDataResponse).required - (intelData as InsufficientDataResponse).txn_count} more transactions to unlock spending insights.
              </Text>
            ) : (
              <Text style={styles.intelBody} numberOfLines={3}>
                You've spent{" "}
                <Text style={{ color: C.primary, fontWeight: "700" }}>
                  {formatINR(weeklySpend)}
                </Text>{" "}
                this week.
                {signals?.projection_30d
                   ? ` Projected 30-day: ${formatINR(signals.projection_30d)}.`
                   : ""}
              </Text>
            )}
            <TouchableOpacity
              style={styles.intelBtn}
              onPress={() => router.push("/(tabs)/insights")}
            >
              <Text style={styles.intelBtnText}>See details</Text>
              <ChevronRight color={C.primary} size={14} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

        {/* ── Risk + Budget Row ─────────────────────────────────────────── */}
        {(intel || monthlyBudget > 0) && (
          <View style={styles.statRow}>
            {intel && (
              <View style={[styles.statChip, { borderColor: riskColor + "40" }]}>
                <Text style={[styles.statChipLabel, { color: riskColor }]}>
                  {(signals?.risk_level ?? "").charAt(0).toUpperCase() +
                    (signals?.risk_level ?? "").slice(1)}{" "}
                  Risk
                </Text>
                <Text style={styles.statChipValue}>
                  Score {signals?.risk_score ?? 0}
                </Text>
              </View>
            )}
            {monthlyBudget > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>Monthly Budget</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(budgetProgress * 100)}%` as any,
                        backgroundColor: budgetProgress > 0.85 ? C.error : C.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.statChipValue}>
                  {formatINR(monthlySpent)} / {formatINR(monthlyBudget)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Recent Transactions ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.sectionSub}>Your recent expense history</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/expenses")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {expLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
          ) : expError ? (
            <View style={styles.emptyState}>
              <Zap color={C.primary} size={40} strokeWidth={1.5} />
              <Text style={styles.emptyText}>Server is waking up…</Text>
              <Text style={styles.emptyHint}>Pull down to refresh, or it will retry automatically</Text>
              <TouchableOpacity
                style={{ marginTop: 16, backgroundColor: C.primary + '22', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
                onPress={onRefresh}
              >
                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Retry Now</Text>
              </TouchableOpacity>
            </View>
          ) : recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Receipt color={C.outline} size={40} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptyHint}>Tap + to add your first expense</Text>
            </View>
          ) : (
            recentExpenses.map((item, idx) => (
              <TransactionRow
                key={item.id ?? idx}
                item={item}
                onPress={() => {
                  router.navigate("/(tabs)/expenses" as any);
                  setTimeout(() => router.push(`/(tabs)/expenses/edit?id=${item.id}` as any), 50);
                }}
              />
            ))
          )}
        </View>

        {/* Bottom padding so FAB + nav pill don't overlap last item */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ── Floating Action Button ──────────────────────────────────────── */}
      <FAB onPress={() => {
        // Navigate to expenses tab first, then push the add screen
        // This keeps the add screen in the expenses stack (not home stack)
        router.navigate("/(tabs)/expenses" as any);
        setTimeout(() => router.push("/(tabs)/expenses/add" as any), 50);
      }} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Row Sub-component
// ─────────────────────────────────────────────────────────────────────────────
function TransactionRow({
  item,
  onPress,
}: {
  item: ExpenseResponse;
  onPress: () => void;
}) {
  const color = getCategoryColor(item.category);
  const label = getCategoryLabel(item.category);

  return (
    <TouchableOpacity onPress={onPress} style={styles.txRow} activeOpacity={0.7}>
      <View style={[styles.txIcon, { backgroundColor: color + "22" }]}>
        <CategoryIcon cat={item.category} color={color} size={22} />
      </View>
      <View style={styles.txCenter}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.description || label}
        </Text>
        <Text style={styles.txMeta}>
          {label} · {relativeTime(item.timestamp)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>−{formatINRFull(item.amount)}</Text>
        {item.anomaly_flag && (
          <View style={styles.anomalyDot} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAB Sub-component
// ─────────────────────────────────────────────────────────────────────────────
function FAB({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.fab}
      activeOpacity={0.85}
      accessibilityLabel="Add expense"
      accessibilityRole="button"
    >
      <Plus color={C.onPrimary} size={28} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(19,19,19,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: C.outline + "30",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.onPrimary, fontSize: 13, fontWeight: "700" },
  headerTitle: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: { paddingTop: 24, paddingHorizontal: 20 },

  bentoCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
  },

  // Spend card — full width
  spendCard: {
    backgroundColor: C.surface,
    position: "relative",
  },
  spendGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.primary,
    opacity: 0.06,
  },
  spendLabel: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  spendAmount: {
    color: C.onSurface,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 12,
  },
  spendBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  spendBadgeText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  // Intel card — full width, horizontal layout
  intelCard: {
    backgroundColor: C.surfaceHighest,
    borderWidth: 1,
    borderColor: C.outline + "28",
    gap: 6,
  },
  intelTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 20,
  },
  intelBody: {
    color: C.onSurfaceVar,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  intelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  intelBtnText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Stats Row ──────────────────────────────────────────────────────────────
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.outline + "40",
    gap: 4,
  },
  statChipLabel: {
    color: C.onSurfaceVar,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statChipValue: {
    color: C.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 4,
    backgroundColor: C.surfaceHighest,
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  sectionTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionSub: {
    color: C.onSurfaceVar,
    fontSize: 12,
    marginTop: 2,
  },
  viewAll: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Transaction Row ────────────────────────────────────────────────────────
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 16,
    marginBottom: 4,
    gap: 14,
  },
  txIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  txCenter: { flex: 1 },
  txTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  txMeta: {
    color: C.onSurfaceVar,
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  txRight: { alignItems: "flex-end" },
  txAmount: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  anomalyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.error,
    marginTop: 5,
  },

  // ── Forecast Card ──────────────────────────────────────────────────────────
  forecastCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outline + "22",
  },
  forecastHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forecastLabel: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  forecastDays: {
    color: C.outline,
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: C.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  forecastAmount: {
    color: C.onSurface,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  forecastSub: {
    color: C.onSurfaceVar + "88",
    fontSize: 12,
    marginTop: 4,
  },
  forecastBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  forecastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  forecastBudgetText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyHint: {
    color: C.onSurfaceVar,
    fontSize: 13,
  },

  // ── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 120,
    right: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 24px rgba(204,201,137,0.4)" } as any,
    }),
  },
});
