/**
 * Ledger (Expenses Tab) — Transaction activity feed.
 *
 * Sections:
 *  1. Search bar (glass-card)
 *  2. Filter chips (All / scrollable category chips)
 *  3. Section header — "FINANCIAL HISTORY" / "Activity"
 *  4. Transactions grouped by date (Today, Yesterday, Earlier this Week, etc.)
 *
 * Backend: GET /expenses via useExpenses()
 */
import React, { useState, useMemo } from "react";
import {
  SectionList,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useExpenses } from "@/api/queries/useExpenses";
import { formatINRFull } from "@/utils/currency";
import { getCategoryLabel } from "@/utils/categories";
import QuickAddFAB from "@/components/expense/QuickAddFAB";
import OfflineBanner from "@/components/ui/OfflineBanner";
import {
  isToday,
  isYesterday,
  parseISO,
  format,
  isThisWeek,
  isThisMonth,
} from "date-fns";

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
  secondaryContainer: "#434C37",
} as const;

// ─── Category SVG icons ───────────────────────────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  food: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  transport: `<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor"/></svg>`,
  entertainment: `<svg viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="currentColor"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" fill="currentColor"/></svg>`,
  groceries: `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
  health: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" fill="currentColor"/></svg>`,
  education: `<svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="currentColor"/></svg>`,
  utilities: `<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="currentColor"/></svg>`,
  rent: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>`,
  subscriptions: `<svg viewBox="0 0 24 24"><path d="M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-6 4l-6-3.27v6.53L16 16z" fill="currentColor"/></svg>`,
  dining_out: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h18v-2H2v2z" fill="currentColor"/></svg>`,
  travel: `<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/></svg>`,
  alcohol: `<svg viewBox="0 0 24 24"><path d="M6 3l-1 9h6.5l-1-9H6zm7 0l-1 9h6l-1-9h-4.5zM3 14c0 1.1.9 2 2 2h4.5v5H8v1h8v-1h-1.5v-5H19c1.1 0 2-.9 2-2l-1-2H4l-1 2z" fill="currentColor"/></svg>`,
  electronics: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
  fitness: `<svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" fill="currentColor"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z" fill="currentColor"/></svg>`,
  insurance: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/></svg>`,
  clothing: `<svg viewBox="0 0 24 24"><path d="M21.6 18.2L13 11.75v-.91a3.496 3.496 0 00-.18-6.75A3.51 3.51 0 008.5 7.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .84-.69 1.52-1.53 1.5-.54.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8zM6.54 18L12 13.89 17.46 18H6.54z" fill="currentColor"/></svg>`,
  misc: `<svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
  personal_care: `<svg viewBox="0 0 24 24"><path d="M9.5 9.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.33 0-7 1.17-7 3.5V17h14v-2c0-2.33-4.67-3.5-7-3.5zm7.5 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V17h6v-2c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>`,
  gifts: `<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" fill="currentColor"/></svg>`,
  charity: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
  emi: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="currentColor"/></svg>`,
  recharge: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
};

const searchIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>`;

const FILTERS = ["All", "Food", "Transport", "Shopping", "Health", "Entertainment"] as const;

// ─── Date grouping helper ─────────────────────────────────────────────────────
function groupByDate(items: any[]): { title: string; data: any[] }[] {
  const groups: Record<string, any[]> = {};
  const order: string[] = [];

  for (const item of items) {
    let d: Date;
    try {
      d = parseISO(item.timestamp);
    } catch {
      d = new Date(item.timestamp);
    }

    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else if (isThisWeek(d, { weekStartsOn: 1 })) label = "Earlier this Week";
    else if (isThisMonth(d)) label = "Earlier this Month";
    else label = format(d, "MMMM yyyy");

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(item);
  }

  return order.map((title) => ({ title, data: groups[title] }));
}

// ─── Format time from ISO ─────────────────────────────────────────────────────
function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "";
  }
}

function formatShortDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function LedgerScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { data, isLoading } = useExpenses({ page: 1, limit: 50 });

  const transactions = useMemo(() => {
    const raw = data?.transactions ?? [];
    let filtered = raw;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t: any) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (activeFilter !== "All") {
      const cat = activeFilter.toLowerCase();
      filtered = filtered.filter((t: any) => t.category?.toLowerCase() === cat);
    }

    return filtered;
  }, [data, search, activeFilter]);

  const sections = useMemo(() => groupByDate(transactions), [transactions]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Transactions</Text>
      </View>

      <OfflineBanner />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {/* ── Search ──────────────────────────────────────── */}
            <View style={s.searchWrap}>
              <View style={s.searchIconWrap}>
                <SvgXml
                  xml={searchIcon.replace(/currentColor/g, C.onSurfaceVar + "80")}
                  width={20}
                  height={20}
                />
              </View>
              <TextInput
                style={s.searchInput}
                placeholder="Search transactions..."
                placeholderTextColor={C.onSurfaceVar + "66"}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>

            {/* ── Filters ─────────────────────────────────────── */}
            <View style={s.filtersRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    s.filterChip,
                    activeFilter === f && s.filterChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.filterText,
                      activeFilter === f && s.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Section Title ────────────────────────────────── */}
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionLabel}>FINANCIAL HISTORY</Text>
                <Text style={s.sectionTitle}>Activity</Text>
              </View>
            </View>
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={s.dateGroupLabel}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const catIcon = CAT_ICONS[item.category] ?? CAT_ICONS.misc;
          const catLabel = getCategoryLabel(item.category);
          const timeStr = isToday(parseISO(item.timestamp))
            ? formatTime(item.timestamp)
            : formatShortDate(item.timestamp);

          return (
            <TouchableOpacity
              style={s.txnCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/(tabs)/expenses/edit?id=${item.id}`)
              }
            >
              <View style={s.txnLeft}>
                {/* Category icon */}
                <View style={[s.txnIconWrap, item.anomaly_flag && s.txnIconAnomaly]}>
                  <SvgXml
                    xml={catIcon.replace(/currentColor/g, item.anomaly_flag ? C.error : C.primary)}
                    width={22}
                    height={22}
                  />
                </View>
                {/* Description */}
                <View style={s.txnInfo}>
                  <Text style={s.txnDesc} numberOfLines={1}>
                    {item.description || catLabel}
                  </Text>
                  <Text style={s.txnMeta}>
                    {catLabel} • {timeStr}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <Text style={s.txnAmount}>
                -{formatINRFull(item.amount)}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            {isLoading ? (
              <ActivityIndicator size="large" color={C.primary} />
            ) : (
              <>
                <View style={s.emptyIcon}>
                  <SvgXml
                    xml={`<svg viewBox="0 0 24 24"><path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5z" fill="${C.onSurfaceVar}44"/></svg>`}
                    width={40}
                    height={40}
                  />
                </View>
                <Text style={s.emptyTitle}>No transactions yet</Text>
                <Text style={s.emptySub}>
                  Add your first expense to start tracking.
                </Text>
              </>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 140 }} />}
      />

      <QuickAddFAB />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  listContent: { paddingBottom: 40 },

  // ── Header Bar ─────────────────────────────────────────────────────────────
  headerBar: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerTitle: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 18,
    position: "relative",
  },
  searchIconWrap: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 18,
    paddingVertical: Platform.OS === "ios" ? 16 : 14,
    paddingLeft: 48,
    paddingRight: 16,
    color: C.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "transparent",
  },

  // ── Filters ────────────────────────────────────────────────────────────────
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 10,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.surfaceHigh,
  },
  filterChipActive: {
    backgroundColor: C.primary,
  },
  filterText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: C.onPrimary,
  },

  // ── Section Title ──────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 22,
    marginBottom: 22,
  },
  sectionLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  sectionTitle: {
    color: C.onSurface,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },

  // ── Date group header ──────────────────────────────────────────────────────
  dateGroupLabel: {
    color: C.onSurfaceVar + "99",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 22,
    marginTop: 20,
    marginBottom: 12,
  },

  // ── Transaction Card ───────────────────────────────────────────────────────
  txnCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.outlineVar + "0A",
  },
  txnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  txnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  txnIconAnomaly: {
    backgroundColor: C.error + "15",
  },
  txnInfo: {
    flex: 1,
  },
  txnDesc: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  txnMeta: {
    color: C.onSurfaceVar + "99",
    fontSize: 11,
  },
  txnAmount: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    color: C.onSurfaceVar + "80",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
