/**
 * Expense Details / Edit Screen — Premium detail view.
 *
 * Layout:
 *  1. Header: ← back + "Expense Details"
 *  2. Transaction Identity: centered icon, description, amount, timestamp
 *  3. Details Cards: Category card, Description card
 *  4. Action Buttons: Edit (gold), Delete (error outline)
 *
 * Data: Finds the expense by id from the cached query list.
 * Mutations: useUpdateExpense, useDeleteExpense
 */
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useExpenses } from "@/api/queries/useExpenses";
import { useUpdateExpense } from "@/api/mutations/useUpdateExpense";
import { useDeleteExpense } from "@/api/mutations/useDeleteExpense";
import { formatINRFull } from "@/utils/currency";
import { getCategoryLabel } from "@/utils/categories";
import { format, parseISO } from "date-fns";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  surfaceLowest: "#0E0E0E",
  primary: "#CCC989",
  primaryContainer: "#969359",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#939182",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  errorContainer: "#93000A",
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const editIcon = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>`;
const deleteIcon = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>`;

// Category SVG icons (reused from ledger)
const CAT_ICONS: Record<string, string> = {
  food: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  transport: `<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="currentColor"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" fill="currentColor"/></svg>`,
  entertainment: `<svg viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" fill="currentColor"/></svg>`,
  health: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" fill="currentColor"/></svg>`,
  groceries: `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
  dining_out: `<svg viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/></svg>`,
  electronics: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
  subscriptions: `<svg viewBox="0 0 24 24"><path d="M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-6 4l-6-3.27v6.53L16 16z" fill="currentColor"/></svg>`,
  misc: `<svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>`,
  rent: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>`,
  utilities: `<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="currentColor"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h18v-2H2v2z" fill="currentColor"/></svg>`,
  travel: `<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z" fill="currentColor"/></svg>`,
  education: `<svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="currentColor"/></svg>`,
  fitness: `<svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" fill="currentColor"/></svg>`,
  clothing: `<svg viewBox="0 0 24 24"><path d="M21.6 18.2L13 11.75v-.91a3.496 3.496 0 00-.18-6.75A3.51 3.51 0 008.5 7.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .84-.69 1.52-1.53 1.5-.54.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8zM6.54 18L12 13.89 17.46 18H6.54z" fill="currentColor"/></svg>`,
  insurance: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/></svg>`,
  emi: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="currentColor"/></svg>`,
  alcohol: `<svg viewBox="0 0 24 24"><path d="M6 3l-1 9h6.5l-1-9H6zm7 0l-1 9h6l-1-9h-4.5zM3 14c0 1.1.9 2 2 2h4.5v5H8v1h8v-1h-1.5v-5H19c1.1 0 2-.9 2-2l-1-2H4l-1 2z" fill="currentColor"/></svg>`,
  personal_care: `<svg viewBox="0 0 24 24"><path d="M9.5 9.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.33 0-7 1.17-7 3.5V17h14v-2c0-2.33-4.67-3.5-7-3.5zm7.5 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V17h6v-2c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/></svg>`,
  gifts: `<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" fill="currentColor"/></svg>`,
  charity: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
  recharge: `<svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="currentColor"/></svg>`,
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useExpenses({ page: 1, limit: 100 });
  const { mutate: remove, isPending: deleting } = useDeleteExpense();

  // Find expense from cached list
  const expense = useMemo(() => {
    const all = (data as any)?.transactions ?? data?.expenses ?? [];
    return all.find((t: any) => t.id === id);
  }, [data, id]);

  if (!expense) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Expense Details</Text>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catIcon = CAT_ICONS[expense.category] ?? CAT_ICONS.misc;
  const catLabel = getCategoryLabel(expense.category);
  let dateStr = "";
  let timeStr = "";
  try {
    const d = parseISO(expense.timestamp);
    dateStr = format(d, "MMMM d, yyyy");
    timeStr = format(d, "HH:mm") + " PM";
  } catch {
    dateStr = expense.timestamp;
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (id) remove(id, { onSuccess: () => router.back() });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Expense Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Transaction Identity ─────────────────────────── */}
        <View style={s.identitySection}>
          {/* Large centered icon */}
          <View style={s.identityIconWrap}>
            <SvgXml
              xml={catIcon.replace(/currentColor/g, C.primary)}
              width={36}
              height={36}
            />
          </View>

          {/* Description label */}
          <Text style={s.identityLabel}>
            {expense.description || catLabel}
          </Text>

          {/* Amount */}
          <Text style={s.identityAmount}>
            -₹{expense.amount?.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>

          {/* Date/time */}
          <Text style={s.identityDate}>
            {dateStr} • {timeStr}
          </Text>
        </View>

        {/* ── Details Cards ────────────────────────────────── */}
        <View style={s.cardsSection}>
          {/* Category Card */}
          <View style={s.detailCard}>
            <Text style={s.detailLabel}>CATEGORY</Text>
            <View style={s.detailRow}>
              <View style={s.detailIconWrap}>
                <SvgXml
                  xml={catIcon.replace(/currentColor/g, C.primary)}
                  width={20}
                  height={20}
                />
              </View>
              <Text style={s.detailValue}>{catLabel}</Text>
            </View>
          </View>

          {/* Description Card */}
          <View style={s.detailCard}>
            <Text style={s.detailLabel}>DESCRIPTION</Text>
            <Text style={s.descText}>
              {expense.description || "No description provided."}
            </Text>
          </View>

          {/* Anomaly Flag */}
          {expense.anomaly_flag && (
            <View style={s.anomalyCard}>
              <Text style={s.anomalyLabel}>ANOMALY DETECTED</Text>
              <Text style={s.anomalyText}>
                This transaction was flagged as unusual by the AtomicShift Intelligence engine.
              </Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ───────────────────────────────── */}
        <View style={s.actionsSection}>
          {(() => {
            // Check if transaction is older than 7 days
            let isOld = false;
            try {
              const txnDate = parseISO(expense.timestamp);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
              isOld = diffDays > 7;
            } catch {}

            return isOld ? (
              <View style={[s.editBtn, { opacity: 0.4, backgroundColor: C.surfaceHighest }]}>
                <SvgXml
                  xml={editIcon.replace(/currentColor/g, C.outline)}
                  width={20}
                  height={20}
                />
                <Text style={[s.editBtnText, { color: C.outline }]}>Editing Locked (7+ days old)</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.editBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/(tabs)/expenses/add?editId=${expense.id}&amount=${expense.amount}&category=${expense.category}&description=${encodeURIComponent(expense.description || "")}&timestamp=${encodeURIComponent(expense.timestamp)}`)}
              >
                <SvgXml
                  xml={editIcon.replace(/currentColor/g, C.onPrimary)}
                  width={20}
                  height={20}
                />
                <Text style={s.editBtnText}>Edit Transaction</Text>
              </TouchableOpacity>
            );
          })()}

          <TouchableOpacity
            style={s.deleteBtn}
            activeOpacity={0.85}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={C.error} />
            ) : (
              <>
                <SvgXml
                  xml={deleteIcon.replace(/currentColor/g, C.error)}
                  width={20}
                  height={20}
                />
                <Text style={s.deleteBtnText}>Delete Record</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.onSurface,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    flex: 1,
  },

  // ── Loading ────────────────────────────────────────────────────────────────
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: C.onSurfaceVar + "80",
    fontSize: 14,
  },

  // ── Transaction Identity ───────────────────────────────────────────────────
  identitySection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  identityIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceHighest + "66",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  identityLabel: {
    color: C.onSurfaceVar,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  identityAmount: {
    color: C.onSurface,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -2,
    marginBottom: 6,
  },
  identityDate: {
    color: C.outline,
    fontSize: 13,
  },

  // ── Detail Cards ───────────────────────────────────────────────────────────
  cardsSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  detailCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 22,
  },
  detailLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
  },
  descText: {
    color: C.onSurfaceVar,
    fontSize: 14,
    lineHeight: 22,
  },

  // Anomaly
  anomalyCard: {
    backgroundColor: C.errorContainer + "33",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: C.error + "1A",
  },
  anomalyLabel: {
    color: C.error,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  anomalyText: {
    color: C.error,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  editBtn: {
    height: 58,
    backgroundColor: C.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  editBtnText: {
    color: C.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  deleteBtn: {
    height: 58,
    backgroundColor: C.surfaceHighest,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.error + "33",
  },
  deleteBtnText: {
    color: C.error,
    fontSize: 16,
    fontWeight: "800",
  },
});
