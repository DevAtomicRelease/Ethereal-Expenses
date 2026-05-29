/**
 * Add / Edit Expense Screen — Premium glass-card form with inline calendar.
 *
 * Modes:
 *   - ADD:  No query params → empty form, POST /expense
 *   - EDIT: ?editId=…&amount=…&category=…&description=…&timestamp=…
 *           → pre-fills form, PUT /expenses/{id}
 *
 * Sections:
 *  1. Back arrow + "Add Expense" / "Edit Expense" header
 *  2. Amount input (hero glass-panel with ₹ prefix)
 *  3. Category picker (scrollable chips)
 *  4. Description textarea
 *  5. Inline mini calendar (date picker)
 *  6. Fixed bottom bar with "Save Expense" / "Update Expense" button
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Modal,
} from "react-native";
import { useTodaySpend } from "@/hooks/useTodaySpend";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, ExpenseFormData } from "@/utils/validation";
import { getCategoryLabel } from "@/utils/categories";
import { useAddExpense } from "@/api/mutations/useAddExpense";
import { useUpdateExpense } from "@/api/mutations/useUpdateExpense";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns";

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
const checkIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`;
const chevronLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>`;
const chevronRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`;

// ─── Category definitions ─────────────────────────────────────────────────────
const TOP_CATEGORIES = [
  "food", "transport", "entertainment", "shopping", "groceries",
  "dining_out", "health", "coffee", "subscriptions", "utilities",
  "rent", "education", "travel", "fuel", "fitness",
  "clothing", "electronics", "personal_care", "alcohol",
  "gifts", "charity", "insurance", "emi", "recharge", "misc",
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ─── Calendar Component ──────────────────────────────────────────────────────
function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const result: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [viewMonth]);

  return (
    <View style={cal.wrap}>
      {/* Month navigator */}
      <View style={cal.headerRow}>
        <TouchableOpacity
          onPress={() => setViewMonth(subMonths(viewMonth, 1))}
          style={cal.navBtn}
        >
          <SvgXml
            xml={chevronLeft.replace(/currentColor/g, C.onSurfaceVar)}
            width={20}
            height={20}
          />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>
          {format(viewMonth, "MMMM yyyy")}
        </Text>
        <TouchableOpacity
          onPress={() => setViewMonth(addMonths(viewMonth, 1))}
          style={cal.navBtn}
        >
          <SvgXml
            xml={chevronRight.replace(/currentColor/g, C.onSurfaceVar)}
            width={20}
            height={20}
          />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={cal.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={cal.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={cal.daysGrid}>
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());

          return (
            <TouchableOpacity
              key={i}
              style={[
                cal.dayBtn,
                isSelected && cal.dayBtnSelected,
                isToday && !isSelected && cal.dayBtnToday,
              ]}
              onPress={() => {
                onSelect(day);
                if (!isCurrentMonth) setViewMonth(startOfMonth(day));
              }}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  cal.dayText,
                  !isCurrentMonth && cal.dayTextMuted,
                  isSelected && cal.dayTextSelected,
                ]}
              >
                {format(day, "d")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    amount?: string;
    category?: string;
    description?: string;
    timestamp?: string;
  }>();

  const isEditing = !!params.editId;
  const { mutate: addMutate, isPending: addPending } = useAddExpense();
  const { mutate: updateMutate, isPending: updatePending } = useUpdateExpense();
  const isPending = isEditing ? updatePending : addPending;

  // ── Budget warning state ────────────────────────────────────────────────
  const { todaySpent, dailyLimit, percentUsed, isNearBudget } = useTodaySpend();
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ExpenseFormData | null>(null);

  // Parse initial values from params (edit mode) or defaults (add mode)
  const initialAmount = params.amount ? parseFloat(params.amount) : 0;
  const initialCategory = params.category || "food";
  const initialDescription = params.description
    ? decodeURIComponent(params.description)
    : "";
  const initialTimestamp = params.timestamp
    ? decodeURIComponent(params.timestamp)
    : new Date().toISOString();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: initialAmount,
      category: initialCategory,
      description: initialDescription,
      timestamp: initialTimestamp,
    },
  });

  const currentTimestamp = watch("timestamp");
  const selectedDate = useMemo(() => {
    try {
      return parseISO(currentTimestamp);
    } catch {
      return new Date();
    }
  }, [currentTimestamp]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      // Preserve the time from the current timestamp, just change the date
      const existing = (() => {
        try {
          return parseISO(currentTimestamp);
        } catch {
          return new Date();
        }
      })();
      date.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
      setValue("timestamp", date.toISOString());
    },
    [currentTimestamp, setValue]
  );

  // ── Actually submit the expense (called directly or after warning confirmation)
  const submitExpense = (data: ExpenseFormData) => {
    if (isEditing) {
      updateMutate(
        {
          id: params.editId!,
          data: {
            amount: data.amount,
            category: data.category,
            description: data.description,
            timestamp: data.timestamp,
            mood: data.mood,
          },
        },
        {
          onSuccess: () => {
            router.back();
            setTimeout(() => router.back(), 100);
          },
          onError: (err) =>
            Alert.alert("Error", err.message || "Failed to update expense."),
        }
      );
    } else {
      addMutate(
        {
          amount: data.amount,
          category: data.category,
          description: data.description,
          timestamp: data.timestamp,
          mood: data.mood,
        },
        {
          onSuccess: () => router.back(),
          onError: (err) =>
            Alert.alert("Error", err.message || "Failed to save expense."),
        }
      );
    }
  };

  // ── Pre-save handler: check budget before submitting ────────────────────
  const onSave = (data: ExpenseFormData) => {
    // Only show warning for new expenses (not edits), when near/over daily budget
    if (!isEditing && dailyLimit > 0) {
      const newTotal = todaySpent + data.amount;
      const newPercent = newTotal / dailyLimit;
      if (newPercent >= 0.8) {
        // Store the form data and show warning
        setPendingFormData(data);
        setShowBudgetWarning(true);
        return;
      }
    }
    submitExpense(data);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml
              xml={backArrow.replace(/currentColor/g, C.primary)}
              width={22}
              height={22}
            />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {isEditing ? "Edit Expense" : "Add Expense"}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Amount Section ─────────────────────────────────── */}
          <View style={s.amountSection}>
            <Text style={s.amountLabel}>AMOUNT (INR)</Text>
            <View style={s.amountPanel}>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <View style={s.amountRow}>
                    <Text style={s.currencySymbol}>₹</Text>
                    <TextInput
                      style={s.amountInput}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={C.surfaceHighest}
                      value={value ? String(value) : ""}
                      onChangeText={(t) => {
                        const cleaned = t.replace(/[^0-9.]/g, "");
                        onChange(parseFloat(cleaned) || 0);
                      }}
                    />
                  </View>
                )}
              />
            </View>
            {errors.amount && (
              <Text style={s.errorText}>{String(errors.amount.message)}</Text>
            )}
          </View>

          {/* ── Category ───────────────────────────────────────── */}
          <View style={s.fieldSection}>
            <Text style={s.fieldLabel}>Category</Text>
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <View style={s.categoryWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.categoryScroll}
                  >
                    {TOP_CATEGORIES.map((cat) => {
                      const isActive = value === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => onChange(cat)}
                          style={[
                            s.categoryChip,
                            isActive && s.categoryChipActive,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              s.categoryChipText,
                              isActive && s.categoryChipTextActive,
                            ]}
                          >
                            {getCategoryLabel(cat)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            />
          </View>

          {/* ── Description ────────────────────────────────────── */}
          <View style={s.fieldSection}>
            <Text style={s.fieldLabel}>Description (Optional)</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={s.descInput}
                  placeholder="What was this for?"
                  placeholderTextColor={C.outlineVar + "88"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={value || ""}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
          {/* ── Mood (Optional) ──────────────────────────────────── */}
          <View style={s.fieldSection}>
            <Text style={s.fieldLabel}>How are you feeling? (Optional)</Text>
            <Controller
              control={control}
              name="mood"
              render={({ field: { onChange, value } }) => (
                <View style={s.moodRow}>
                  {[
                    { key: "happy",      emoji: "😊", label: "Happy" },
                    { key: "neutral",    emoji: "😐", label: "Neutral" },
                    { key: "stressed",   emoji: "😟", label: "Stressed" },
                    { key: "frustrated", emoji: "😤", label: "Frustrated" },
                    { key: "tired",      emoji: "😴", label: "Tired" },
                  ].map((m) => {
                    const active = value === m.key;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        onPress={() => onChange(active ? undefined : m.key)}
                        style={[s.moodChip, active && s.moodChipActive]}
                        activeOpacity={0.7}
                      >
                        <Text style={s.moodEmoji}>{m.emoji}</Text>
                        <Text style={[s.moodLabel, active && s.moodLabelActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* ── Calendar ───────────────────────────────────────── */}
          <View style={s.fieldSection}>
            <Text style={s.fieldLabel}>Date</Text>
            <MiniCalendar selected={selectedDate} onSelect={handleDateSelect} />
          </View>

          {/* Spacer for bottom bar */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Bottom Save Bar ──────────────────────────────────── */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.saveBtn, isPending && s.saveBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleSubmit(onSave)}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={C.onPrimary} />
            ) : (
              <>
                <SvgXml
                  xml={checkIcon.replace(/currentColor/g, C.onPrimary)}
                  width={22}
                  height={22}
                />
                <Text style={s.saveBtnText}>
                  {isEditing ? "Update Expense" : "Save Expense"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Budget Warning Bottom Sheet ─────────────────────────── */}
      <BudgetWarningSheet
        visible={showBudgetWarning}
        todaySpent={todaySpent}
        newAmount={pendingFormData?.amount ?? 0}
        dailyLimit={dailyLimit}
        onConfirm={() => {
          setShowBudgetWarning(false);
          if (pendingFormData) submitExpense(pendingFormData);
          setPendingFormData(null);
        }}
        onCancel={() => {
          setShowBudgetWarning(false);
          setPendingFormData(null);
        }}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET WARNING BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════════
function BudgetWarningSheet({
  visible,
  todaySpent,
  newAmount,
  dailyLimit,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  todaySpent: number;
  newAmount: number;
  dailyLimit: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const newTotal = todaySpent + newAmount;
  const pctBefore = dailyLimit > 0 ? Math.min(todaySpent / dailyLimit, 1) : 0;
  const pctAfter = dailyLimit > 0 ? Math.min(newTotal / dailyLimit, 1) : 0;
  const isOver = newTotal > dailyLimit;
  const overBy = Math.max(0, newTotal - dailyLimit);

  const fmt = (n: number) => `\u20B9${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={bw.overlay}>
        <View style={bw.sheet}>
          {/* Drag handle */}
          <View style={bw.handle} />

          {/* Header */}
          <Text style={bw.emoji}>{isOver ? "🚨" : "⚠️"}</Text>
          <Text style={bw.title}>
            {isOver ? "Daily Budget Exceeded" : "Approaching Daily Limit"}
          </Text>
          <Text style={bw.subtitle}>
            {isOver
              ? `This will put you ${fmt(overBy)} over your daily limit.`
              : `You\u2019ve used ${Math.round(pctAfter * 100)}% of today\u2019s budget.`}
          </Text>

          {/* Progress bar */}
          <View style={bw.progressTrack}>
            <View style={[bw.progressBefore, { width: `${Math.round(pctBefore * 100)}%` as any }]} />
            <View
              style={[
                bw.progressNew,
                {
                  width: `${Math.round(Math.min(pctAfter - pctBefore, 1 - pctBefore) * 100)}%` as any,
                  backgroundColor: isOver ? C.error : "#F59E0B",
                },
              ]}
            />
          </View>

          {/* Breakdown */}
          <View style={bw.breakdownRow}>
            <Text style={bw.breakdownLabel}>Spent today</Text>
            <Text style={bw.breakdownValue}>{fmt(todaySpent)}</Text>
          </View>
          <View style={bw.breakdownRow}>
            <Text style={bw.breakdownLabel}>This expense</Text>
            <Text style={[bw.breakdownValue, { color: "#F59E0B" }]}>+{fmt(newAmount)}</Text>
          </View>
          <View style={[bw.breakdownRow, bw.breakdownTotal]}>
            <Text style={[bw.breakdownLabel, { fontWeight: "700" }]}>New total</Text>
            <Text style={[bw.breakdownValue, { color: isOver ? C.error : C.primary, fontWeight: "800" }]}>
              {fmt(newTotal)}
            </Text>
          </View>
          <View style={bw.breakdownRow}>
            <Text style={bw.breakdownLabel}>Daily limit</Text>
            <Text style={bw.breakdownValue}>{fmt(dailyLimit)}</Text>
          </View>

          {/* Buttons */}
          <View style={bw.btnRow}>
            <TouchableOpacity style={bw.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={bw.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={bw.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={bw.confirmBtnText}>Add Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const bw = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceHighest,
    marginBottom: 20,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: C.onSurfaceVar,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: C.surfaceHighest,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBefore: {
    height: "100%",
    backgroundColor: C.primary,
  },
  progressNew: {
    height: "100%",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: C.outlineVar + "33",
    paddingTop: 12,
    marginTop: 4,
  },
  breakdownLabel: {
    color: C.onSurfaceVar,
    fontSize: 14,
  },
  breakdownValue: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVar,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: C.onSurfaceVar,
    fontSize: 15,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.errorContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: C.error,
    fontSize: 15,
    fontWeight: "700",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const cal = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    padding: 6,
    borderRadius: 12,
  },
  monthLabel: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    color: C.onSurfaceVar + "80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayBtn: {
    width: "14.28%" as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayBtnSelected: {
    backgroundColor: C.primary,
  },
  dayBtnToday: {
    borderWidth: 1,
    borderColor: C.primary + "55",
  },
  dayText: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "500",
  },
  dayTextMuted: {
    color: C.outlineVar,
  },
  dayTextSelected: {
    color: C.onPrimary,
    fontWeight: "800",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },

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
  },

  amountSection: {
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  amountLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 14,
  },
  amountPanel: {
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  currencySymbol: {
    color: C.primary,
    fontSize: 36,
    fontWeight: "500",
  },
  amountInput: {
    flex: 1,
    color: C.onSurface,
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -2,
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: C.outline + "33",
  },
  errorText: {
    color: C.error,
    fontSize: 12,
    marginTop: 8,
    paddingLeft: 4,
  },

  fieldSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  fieldLabel: {
    color: C.onSurfaceVar,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },

  categoryWrap: {
    marginHorizontal: -24,
  },
  categoryScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  categoryChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  categoryChipText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: C.onPrimary,
  },

  descInput: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    color: C.onSurface,
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },

  // ── Mood picker ──────────────────────────────────────────────────────────
  moodRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  moodChip: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
    gap: 4,
  },
  moodChipActive: {
    backgroundColor: C.primary + "22",
    borderColor: C.primary,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "600",
  },
  moodLabelActive: {
    color: C.primary,
    fontWeight: "700",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "rgba(19,19,19,0.85)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
      },
      android: { elevation: 24 },
    }),
  },
  saveBtn: {
    height: 60,
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
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: C.onPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
