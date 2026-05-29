/**
 * Impulse Watchlist — Cooling-off log for impulsive purchases.
 *
 * Users log items they want to buy. After a delay, a notification
 * asks if they still want it. They can mark it bought or resisted.
 * Resisted items accumulate as "money saved".
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import {
  loadImpulseItems,
  addImpulseItem,
  markBought,
  markResisted,
  deleteImpulseItem,
  getImpulseStats,
  type ImpulseItem,
  type ImpulseStats,
} from "@/services/impulseService";
import { getCategoryLabel } from "@/utils/categories";

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
  outlineVar: "#939182",
  error: "#FFB4AB",
  success: "#A8D8A8",
} as const;

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

const QUICK_CATEGORIES = [
  "shopping", "electronics", "clothing", "food", "entertainment",
  "coffee", "dining_out", "personal_care", "subscriptions", "misc",
];

const MOODS = [
  { key: "happy",      emoji: "😊" },
  { key: "neutral",    emoji: "😐" },
  { key: "stressed",   emoji: "😟" },
  { key: "frustrated", emoji: "😤" },
  { key: "tired",      emoji: "😴" },
];

export default function ImpulseWatchlistScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ImpulseItem[]>([]);
  const [stats, setStats] = useState<ImpulseStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("shopping");
  const [mood, setMood] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    const [loaded, s] = await Promise.all([loadImpulseItems(), getImpulseStats()]);
    setItems(loaded);
    setStats(s);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const handleAdd = useCallback(async () => {
    const parsedCost = parseFloat(cost);
    if (!name.trim()) return Alert.alert("Required", "Enter the item name.");
    if (!parsedCost || parsedCost <= 0) return Alert.alert("Required", "Enter a valid cost.");

    await addImpulseItem(name.trim(), parsedCost, category, mood, 15);
    setName("");
    setCost("");
    setMood(undefined);
    setShowForm(false);
    await reload();
  }, [name, cost, category, mood, reload]);

  const handleResolve = useCallback(async (id: string, action: "bought" | "resisted") => {
    if (action === "bought") {
      await markBought(id);
    } else {
      await markResisted(id);
    }
    await reload();
  }, [reload]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert("Delete?", "Remove this item from your impulse log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await deleteImpulseItem(id); await reload(); }
      },
    ]);
  }, [reload]);

  const pendingItems = items.filter(i => i.status === "pending");
  const resolvedItems = items.filter(i => i.status !== "pending").slice(0, 20);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Impulse Watchlist</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
      >
        {/* Stats banner */}
        {stats && stats.totalResisted > 0 && (
          <View style={s.statsBanner}>
            <Text style={s.statsEmoji}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.statsTitle}>
                You've saved {fmt(stats.totalSaved)}!
              </Text>
              <Text style={s.statsSub}>
                Resisted {stats.totalResisted} impulse purchase{stats.totalResisted === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        )}

        {/* Add button / Form */}
        {!showForm ? (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ Log an Impulse</Text>
            <Text style={s.addBtnHint}>Pause before you buy. Log it here first.</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.formCard}>
            <Text style={s.formTitle}>What do you want to buy?</Text>

            <TextInput
              style={s.input}
              placeholder="Item name"
              placeholderTextColor={C.outline}
              value={name}
              onChangeText={setName}
            />

            <View style={s.costRow}>
              <Text style={s.currencySymbol}>₹</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Estimated cost"
                placeholderTextColor={C.outline}
                keyboardType="numeric"
                value={cost}
                onChangeText={setCost}
              />
            </View>

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipScroll}
            >
              {QUICK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, category === cat && s.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.chipText, category === cat && s.chipTextActive]}>
                    {getCategoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Mood */}
            <Text style={s.moodQuestion}>How are you feeling right now?</Text>
            <View style={s.moodRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.moodChip, mood === m.key && s.moodChipActive]}
                  onPress={() => setMood(mood === m.key ? undefined : m.key)}
                >
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={s.formBtnRow}>
              <TouchableOpacity
                style={s.formCancelBtn}
                onPress={() => { setShowForm(false); setName(""); setCost(""); setMood(undefined); }}
              >
                <Text style={s.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.formSaveBtn} onPress={handleAdd}>
                <Text style={s.formSaveText}>Start 15min Timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>⏳ Cooling Off...</Text>
            {pendingItems.map((item) => (
              <View key={item.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemMeta}>
                      {getCategoryLabel(item.category)} · {fmt(item.estimatedCost)}
                      {item.mood ? ` · ${MOODS.find(m => m.key === item.mood)?.emoji ?? ""}` : ""}
                    </Text>
                  </View>
                  <Text style={s.itemCost}>{fmt(item.estimatedCost)}</Text>
                </View>
                <View style={s.itemBtnRow}>
                  <TouchableOpacity
                    style={s.resistBtn}
                    onPress={() => handleResolve(item.id, "resisted")}
                  >
                    <Text style={s.resistText}>🛡️ Didn't Buy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.boughtBtn}
                    onPress={() => handleResolve(item.id, "bought")}
                  >
                    <Text style={s.boughtText}>Bought It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={s.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resolved items */}
        {resolvedItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📋 History</Text>
            {resolvedItems.map((item) => (
              <View
                key={item.id}
                style={[s.itemCard, { opacity: 0.7 }]}
              >
                <View style={s.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemMeta}>
                      {getCategoryLabel(item.category)} · {fmt(item.estimatedCost)}
                    </Text>
                  </View>
                  <View style={[
                    s.statusBadge,
                    { backgroundColor: item.status === "resisted" ? C.success + "22" : C.error + "22" },
                  ]}>
                    <Text style={[
                      s.statusText,
                      { color: item.status === "resisted" ? C.success : C.error },
                    ]}>
                      {item.status === "resisted" ? "Saved!" : "Bought"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {items.length === 0 && !showForm && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🧠</Text>
            <Text style={s.emptyTitle}>Your impulse watchlist is empty</Text>
            <Text style={s.emptyHint}>
              Next time you feel the urge to buy something, log it here first.
              Wait 15 minutes — you might change your mind!
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: C.onSurface, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  // Stats banner
  statsBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.success + "12", borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.success + "22", marginBottom: 16,
  },
  statsEmoji: { fontSize: 32 },
  statsTitle: { color: C.success, fontSize: 16, fontWeight: "800" },
  statsSub: { color: C.onSurfaceVar + "88", fontSize: 12, marginTop: 2 },

  // Add button
  addBtn: {
    backgroundColor: C.primary + "15", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.primary + "33", alignItems: "center",
    marginBottom: 20,
  },
  addBtnText: { color: C.primary, fontSize: 16, fontWeight: "800" },
  addBtnHint: { color: C.onSurfaceVar + "77", fontSize: 12, marginTop: 4 },

  // Form
  formCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.outline + "22", marginBottom: 20, gap: 14,
  },
  formTitle: { color: C.onSurface, fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 14,
    color: C.onSurface, fontSize: 14, borderWidth: 1, borderColor: C.outline + "22",
  },
  costRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencySymbol: { color: C.primary, fontSize: 20, fontWeight: "600" },
  chipScroll: { gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outline + "22",
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.onSurfaceVar, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: C.onPrimary },
  moodQuestion: { color: C.onSurfaceVar, fontSize: 13, fontWeight: "500" },
  moodRow: { flexDirection: "row", gap: 10 },
  moodChip: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outline + "22",
  },
  moodChipActive: { backgroundColor: C.primary + "22", borderColor: C.primary },
  moodEmoji: { fontSize: 20 },
  formBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  formCancelBtn: {
    flex: 1, height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: C.outline, alignItems: "center", justifyContent: "center",
  },
  formCancelText: { color: C.onSurfaceVar, fontSize: 14, fontWeight: "600" },
  formSaveBtn: {
    flex: 1.5, height: 48, borderRadius: 14,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  formSaveText: { color: C.onPrimary, fontSize: 14, fontWeight: "800" },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { color: C.onSurface, fontSize: 16, fontWeight: "700", marginBottom: 12 },

  // Item card
  itemCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.outline + "22", marginBottom: 10,
  },
  itemTop: { flexDirection: "row", alignItems: "center" },
  itemName: { color: C.onSurface, fontSize: 15, fontWeight: "600" },
  itemMeta: { color: C.onSurfaceVar + "88", fontSize: 11, marginTop: 2 },
  itemCost: { color: C.primary, fontSize: 16, fontWeight: "800" },
  itemBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  resistBtn: {
    flex: 1, height: 38, borderRadius: 10,
    backgroundColor: C.success + "15", alignItems: "center", justifyContent: "center",
  },
  resistText: { color: C.success, fontSize: 12, fontWeight: "700" },
  boughtBtn: {
    flex: 1, height: 38, borderRadius: 10,
    backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center",
  },
  boughtText: { color: C.onSurfaceVar, fontSize: 12, fontWeight: "600" },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.error + "15", alignItems: "center", justifyContent: "center",
  },
  deleteText: { color: C.error, fontSize: 14 },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: C.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptyHint: { color: C.onSurfaceVar, fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
