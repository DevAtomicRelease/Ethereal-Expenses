/**
 * Spending Heatmap — GitHub-contributions-style calendar view.
 * Each day is color-coded by spend intensity relative to daily average.
 * Tap a day to see that day's breakdown.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { dataClient } from "@/api/dataClient";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Design tokens ──────────────────────────────────────────────────────────
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
  green: "#4CAF50",
  yellow: "#FFD54F",
  red: "#FF7043",
} as const;

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const chevronLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>`;
const chevronRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`;
const closeIcon = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>`;
const fireIcon = `<svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" fill="currentColor"/></svg>`;

// ─── Constants ──────────────────────────────────────────────────────────────
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Heat color ─────────────────────────────────────────────────────────────
function getHeatColor(amount: number, avg: number): string {
  if (amount === 0) return C.surfaceHigh;
  const ratio = amount / Math.max(avg, 1);
  if (ratio <= 0.5) return "#2E7D32";    // Deep green — well under
  if (ratio <= 0.8) return "#66BB6A";    // Light green — under budget
  if (ratio <= 1.0) return "#AED581";    // Lime — around budget
  if (ratio <= 1.3) return "#FFD54F";    // Yellow — slightly over
  if (ratio <= 1.8) return "#FF9800";    // Orange — over
  return "#F44336";                       // Red — significantly over
}

function getHeatLabel(amount: number, avg: number): string {
  if (amount === 0) return "No spending";
  const ratio = amount / Math.max(avg, 1);
  if (ratio <= 0.5) return "Well under average";
  if (ratio <= 0.8) return "Below average";
  if (ratio <= 1.0) return "Near average";
  if (ratio <= 1.3) return "Above average";
  if (ratio <= 1.8) return "High spending";
  return "Very high spending";
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Expense {
  _id: string;
  amount: number;
  category: string;
  description?: string;
  timestamp: string;
}

interface DayData {
  date: string;
  total: number;
  expenses: Expense[];
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HeatmapScreen() {
  const router = useRouter();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Fetch ALL expenses (large limit to get full history)
  const { data: expenseData } = useQuery({
    queryKey: ["expenses", "heatmap"],
    queryFn: async () => {
      const resp: any = await dataClient.get("expenses", {
        searchParams: { page: "1", limit: "500" },
      }).json();
      return resp.expenses || resp.items || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const expenses: Expense[] = expenseData || [];

  // Build daily map
  const { dailyMap, dailyAvg, monthTotal, activeDays, topCategory, streak } = useMemo(() => {
    const map: Record<string, DayData> = {};

    for (const e of expenses) {
      const d = new Date(e.timestamp);
      const key = dateKey(d);
      if (!map[key]) map[key] = { date: key, total: 0, expenses: [] };
      map[key].total += e.amount;
      map[key].expenses.push(e);
    }

    // Monthly stats
    const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    let mTotal = 0;
    let mDays = 0;
    const catTotals: Record<string, number> = {};
    for (const [k, v] of Object.entries(map)) {
      if (k.startsWith(monthKey)) {
        mTotal += v.total;
        if (v.total > 0) mDays++;
        for (const exp of v.expenses) {
          catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount;
        }
      }
    }

    // Top category
    let topCat = "—";
    let topAmt = 0;
    for (const [cat, amt] of Object.entries(catTotals)) {
      if (amt > topAmt) { topCat = cat; topAmt = amt; }
    }

    // Daily average (all-time)
    const allDailyTotals = Object.values(map).filter(d => d.total > 0).map(d => d.total);
    const avg = allDailyTotals.length > 0
      ? allDailyTotals.reduce((a, b) => a + b, 0) / allDailyTotals.length
      : 0;

    // Current "under budget" streak
    let currentStreak = 0;
    const todayKey = dateKey(today);
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const dayTotal = map[k]?.total || 0;
      if (dayTotal <= avg || dayTotal === 0) {
        if (k <= todayKey) currentStreak++;
      } else {
        break;
      }
    }

    return {
      dailyMap: map,
      dailyAvg: avg,
      monthTotal: mTotal,
      activeDays: mDays,
      topCategory: topCat,
      streak: currentStreak,
    };
  }, [expenses, viewMonth, viewYear]);

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isFuture = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const cellSize = Math.floor((SCREEN_W - 64) / 7);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Spending Heatmap</Text>
          <Text style={s.headerSub}>DAILY ACTIVITY</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Month Navigator ── */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={s.navBtn}>
            <SvgXml xml={chevronLeft.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity
            onPress={() => !isFuture && changeMonth(1)}
            style={[s.navBtn, isFuture && { opacity: 0.2 }]}
            disabled={isFuture}
          >
            <SvgXml xml={chevronRight.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{formatCurrency(monthTotal)}</Text>
            <Text style={s.statLabel}>THIS MONTH</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{activeDays}</Text>
            <Text style={s.statLabel}>ACTIVE DAYS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{formatCurrency(Math.round(dailyAvg))}</Text>
            <Text style={s.statLabel}>DAILY AVG</Text>
          </View>
        </View>

        {/* ── Streak Badge ── */}
        {streak > 1 && (
          <View style={s.streakCard}>
            <SvgXml xml={fireIcon.replace(/currentColor/g, "#FF9800")} width={20} height={20} />
            <Text style={s.streakText}>
              {streak}-day streak under daily average
            </Text>
          </View>
        )}

        {/* ── Weekday Headers ── */}
        <View style={[s.weekdayRow, { paddingHorizontal: 16 }]}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={[s.weekdayCell, { width: cellSize }]}>
              <Text style={s.weekdayText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar Grid ── */}
        <View style={s.calendarGrid}>
          {calendarGrid.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={{ width: cellSize, height: cellSize }} />;
            }

            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayData = dailyMap[key];
            const amount = dayData?.total || 0;
            const isToday = key === dateKey(today);
            const isFutureDay = new Date(viewYear, viewMonth, day) > today;
            const color = isFutureDay ? C.surfaceHigh + "44" : getHeatColor(amount, dailyAvg);

            return (
              <TouchableOpacity
                key={key}
                style={[
                  s.dayCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: color,
                  },
                  isToday && s.todayBorder,
                ]}
                activeOpacity={0.7}
                disabled={isFutureDay || !dayData}
                onPress={() => dayData && setSelectedDay(dayData)}
              >
                <Text style={[
                  s.dayNum,
                  amount === 0 && !isFutureDay && { color: C.outline },
                  isFutureDay && { color: C.outlineVar + "66" },
                  amount > 0 && amount > dailyAvg * 1.3 && { color: "#fff" },
                ]}>
                  {day}
                </Text>
                {amount > 0 && !isFutureDay && (
                  <Text style={[
                    s.dayAmount,
                    amount > dailyAvg * 1.3 && { color: "#fff" },
                  ]}>
                    {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : `₹${Math.round(amount)}`}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Legend ── */}
        <View style={s.legendRow}>
          <Text style={s.legendLabel}>Less</Text>
          {["#2E7D32", "#66BB6A", "#AED581", "#FFD54F", "#FF9800", "#F44336"].map((c) => (
            <View key={c} style={[s.legendDot, { backgroundColor: c }]} />
          ))}
          <Text style={s.legendLabel}>More</Text>
        </View>

        {/* ── Top Category ── */}
        <View style={s.topCatCard}>
          <Text style={s.topCatLabel}>TOP CATEGORY THIS MONTH</Text>
          <Text style={s.topCatValue}>{topCategory}</Text>
        </View>
      </ScrollView>

      {/* ── Day Detail Modal ── */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalDate}>
                  {selectedDay && new Date(selectedDay.date + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </Text>
                <Text style={s.modalTotal}>
                  {selectedDay && formatCurrency(selectedDay.total)}
                  {selectedDay && (
                    <Text style={s.modalBadge}>
                      {"  "}
                      {getHeatLabel(selectedDay.total, dailyAvg)}
                    </Text>
                  )}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={s.modalClose}>
                <SvgXml xml={closeIcon.replace(/currentColor/g, C.onSurface)} width={20} height={20} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedDay?.expenses || []}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <View style={s.txnRow}>
                  <View style={[s.txnDot, { backgroundColor: getHeatColor(item.amount, dailyAvg / 3) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.txnDesc}>{item.description || item.category}</Text>
                    <Text style={s.txnCat}>{item.category}</Text>
                  </View>
                  <Text style={s.txnAmt}>{formatCurrency(item.amount)}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={s.emptyText}>No transactions this day.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "22",
  },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    color: C.primary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginTop: 2,
  },

  // ── Month Nav ──
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: { padding: 8 },
  monthLabel: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  statValue: {
    color: C.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    color: C.outline,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // ── Streak ──
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF980015",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FF980030",
  },
  streakText: {
    color: "#FFD54F",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Weekday Headers ──
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
  },
  weekdayCell: { alignItems: "center", paddingVertical: 6 },
  weekdayText: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // ── Calendar Grid ──
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    margin: 1,
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: C.primary,
  },
  dayNum: {
    color: C.onSurface,
    fontSize: 12,
    fontWeight: "700",
  },
  dayAmount: {
    color: C.onSurfaceVar,
    fontSize: 8,
    fontWeight: "600",
    marginTop: 1,
  },

  // ── Legend ──
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 16,
  },
  legendLabel: {
    color: C.outline,
    fontSize: 10,
    fontWeight: "600",
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },

  // ── Top Category ──
  topCatCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  topCatLabel: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  topCatValue: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalDate: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  modalTotal: {
    color: C.primary,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  modalBadge: {
    color: C.onSurfaceVar,
    fontSize: 12,
    fontWeight: "600",
  },
  modalClose: {
    padding: 4,
    backgroundColor: C.surfaceHighest,
    borderRadius: 16,
  },

  // ── Transactions ──
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "22",
    gap: 12,
  },
  txnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  txnDesc: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  txnCat: {
    color: C.outline,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textTransform: "capitalize",
  },
  txnAmt: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: C.outline,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
});
