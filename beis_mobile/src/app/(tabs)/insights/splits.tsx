/**
 * Split Expenses Screen — Track shared expenses with settlements.
 * User's own contribution is recorded as a transaction.
 */
import React, { useState } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useSplits, useCreateSplit, useSettleSplit, useDeleteSplit } from "@/api/queries/useSplits";
import { formatINR } from "@/utils/currency";

const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
  success: "#A8D5A2",
} as const;

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const plusIcon = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>`;
const checkIcon = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`;

export default function SplitsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useSplits();
  const createMutation = useCreateSplit();
  const settleMutation = useSettleSplit();
  const deleteMutation = useDeleteSplit();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [yourShare, setYourShare] = useState("");
  const [participants, setParticipants] = useState([{ name: "", share: "" }]);

  const splits = data?.splits ?? [];
  const totalOwed = data?.total_owed ?? 0;
  const totalYouSpent = data?.total_you_spent ?? 0;
  const activeSplits = splits.filter((s: any) => !s.is_settled);
  const settledSplits = splits.filter((s: any) => s.is_settled);

  const addParticipant = () =>
    setParticipants([...participants, { name: "", share: "" }]);

  const updateParticipant = (idx: number, field: "name" | "share", val: string) => {
    const updated = [...participants];
    updated[idx] = { ...updated[idx], [field]: val };
    setParticipants(updated);
  };

  const removeParticipant = (idx: number) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  // Auto-calculate your share when total and participants change
  const othersTotal = participants.reduce((s, p) => s + (Number(p.share) || 0), 0);
  const autoYourShare = totalAmount ? Math.max(Number(totalAmount) - othersTotal, 0) : 0;

  const handleCreate = async () => {
    const total = Number(totalAmount);
    if (!title.trim() || !total || total <= 0) {
      Alert.alert("Missing Info", "Enter a title and total amount.");
      return;
    }
    const validParts = participants.filter((p) => p.name.trim() && Number(p.share) > 0);
    if (validParts.length === 0) {
      Alert.alert("No Participants", "Add at least one person with their share.");
      return;
    }

    const myShare = yourShare ? Number(yourShare) : autoYourShare;
    const partsTotal = validParts.reduce((s, p) => s + Number(p.share), 0);
    if (Math.abs((myShare + partsTotal) - total) > 1) {
      Alert.alert(
        "Shares Don't Match",
        `Your share (${formatINR(myShare)}) + others (${formatINR(partsTotal)}) = ${formatINR(myShare + partsTotal)}, but total is ${formatINR(total)}.`
      );
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        total_amount: total,
        your_share: myShare,
        record_transaction: true,
        participants: validParts.map((p) => ({ name: p.name.trim(), share: Number(p.share) })),
      });
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create split.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setTotalAmount("");
    setYourShare("");
    setParticipants([{ name: "", share: "" }]);
  };

  const handleSettle = (splitId: string, name: string, amount: number) => {
    Alert.alert(
      "Settle Up",
      `${name} paid you ${formatINR(amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark as Paid", onPress: () => settleMutation.mutate({ splitId, name }) },
      ]
    );
  };

  const handleDelete = (splitId: string) => {
    Alert.alert("Delete Split", "This won't delete the linked transaction.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(splitId) },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Split Expenses</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={s.addBtn}>
          <SvgXml xml={plusIcon.replace(/currentColor/g, C.onPrimary)} width={20} height={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderColor: C.primary + "30" }]}>
            <Text style={s.summaryLabel}>OWED TO YOU</Text>
            <Text style={[s.summaryValue, { color: C.success }]}>{formatINR(totalOwed)}</Text>
          </View>
          <View style={[s.summaryCard, { borderColor: C.outlineVar + "30" }]}>
            <Text style={s.summaryLabel}>YOU CONTRIBUTED</Text>
            <Text style={s.summaryValue}>{formatINR(totalYouSpent)}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" />
        ) : splits.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>🤝</Text>
            <Text style={s.emptyTitle}>No split expenses yet</Text>
            <Text style={s.emptySub}>
              Split a bill with friends — your share gets auto-recorded as a transaction.
            </Text>
          </View>
        ) : (
          <>
            {/* Active Splits */}
            {activeSplits.length > 0 && (
              <View style={s.listSection}>
                <Text style={s.sectionLabel}>ACTIVE SPLITS</Text>
                {activeSplits.map((split: any) => (
                  <SplitCard
                    key={split.id}
                    split={split}
                    onSettle={handleSettle}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* Settled Splits */}
            {settledSplits.length > 0 && (
              <View style={s.listSection}>
                <Text style={s.sectionLabel}>SETTLED</Text>
                {settledSplits.map((split: any) => (
                  <SplitCard
                    key={split.id}
                    split={split}
                    settled
                    onSettle={handleSettle}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Create Modal ── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <View style={s.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>New Split</Text>

              <Text style={s.inputLabel}>TITLE</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Dinner at Olive Garden"
                placeholderTextColor={C.outline}
              />

              <Text style={s.inputLabel}>TOTAL BILL</Text>
              <TextInput
                style={s.input}
                value={totalAmount}
                onChangeText={setTotalAmount}
                placeholder="e.g., 2400"
                placeholderTextColor={C.outline}
                keyboardType="numeric"
              />

              <Text style={s.inputLabel}>YOUR CONTRIBUTION</Text>
              <TextInput
                style={s.input}
                value={yourShare}
                onChangeText={setYourShare}
                placeholder={autoYourShare > 0 ? `Auto: ${formatINR(autoYourShare)}` : "Your share"}
                placeholderTextColor={C.outline}
                keyboardType="numeric"
              />
              <Text style={s.autoHint}>
                {!yourShare && autoYourShare > 0
                  ? `Will auto-calculate as ${formatINR(autoYourShare)} (total − others)`
                  : "This amount will be added to your expense history"}
              </Text>

              <View style={s.participantsHeader}>
                <Text style={s.inputLabel}>WHO OWES YOU</Text>
                <TouchableOpacity onPress={addParticipant}>
                  <Text style={s.addParticipantText}>+ Add Person</Text>
                </TouchableOpacity>
              </View>

              {participants.map((p, i) => (
                <View key={i} style={s.participantInputRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={p.name}
                    onChangeText={(v) => updateParticipant(i, "name", v)}
                    placeholder="Name"
                    placeholderTextColor={C.outline}
                  />
                  <TextInput
                    style={[s.input, { width: 100 }]}
                    value={p.share}
                    onChangeText={(v) => updateParticipant(i, "share", v)}
                    placeholder="₹ Owes"
                    placeholderTextColor={C.outline}
                    keyboardType="numeric"
                  />
                  {participants.length > 1 && (
                    <TouchableOpacity onPress={() => removeParticipant(i)} style={s.removeBtn}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Breakdown Preview */}
              {Number(totalAmount) > 0 && (
                <View style={s.previewCard}>
                  <Text style={s.previewTitle}>SPLIT BREAKDOWN</Text>
                  <View style={s.previewRow}>
                    <Text style={s.previewLabel}>You pay</Text>
                    <Text style={s.previewValue}>
                      {formatINR(yourShare ? Number(yourShare) : autoYourShare)}
                    </Text>
                  </View>
                  {participants.filter(p => p.name && Number(p.share) > 0).map((p, i) => (
                    <View key={i} style={s.previewRow}>
                      <Text style={s.previewLabel}>{p.name} owes</Text>
                      <Text style={s.previewValue}>{formatINR(Number(p.share))}</Text>
                    </View>
                  ))}
                  <View style={[s.previewRow, { borderTopWidth: 1, borderTopColor: C.outlineVar + "20", paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[s.previewLabel, { fontWeight: "700" }]}>Total</Text>
                    <Text style={[s.previewValue, { color: C.primary }]}>
                      {formatINR(Number(totalAmount))}
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.createBtn, createMutation.isPending && { opacity: 0.5 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  <Text style={s.createBtnText}>
                    {createMutation.isPending ? "Creating..." : "Split & Record"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}


// ── Split Card Component ─────────────────────────────────────────────────────
function SplitCard({
  split, settled, onSettle, onDelete,
}: {
  split: any; settled?: boolean;
  onSettle: (id: string, name: string, amount: number) => void;
  onDelete: (id: string) => void;
}) {
  const settledCount = split.participants.filter((p: any) => p.settled).length;
  const progress = split.participants.length > 0
    ? settledCount / split.participants.length : 0;

  return (
    <View style={[s.splitCard, settled && { opacity: 0.55 }]}>
      {/* Top Row */}
      <View style={s.splitTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.splitTitle}>{split.title}</Text>
          <Text style={s.splitDate}>
            {new Date(split.created_at).toLocaleDateString("en-IN", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.splitTotal}>{formatINR(split.total_amount)}</Text>
          <Text style={s.splitCategory}>
            {split.category.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Your Contribution */}
      <View style={s.yourShareRow}>
        <Text style={s.yourShareLabel}>Your Contribution</Text>
        <Text style={s.yourShareValue}>{formatINR(split.your_share)}</Text>
      </View>

      {/* Settlement Progress */}
      <View style={s.progressSection}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>
            Settlement ({settledCount}/{split.participants.length})
          </Text>
          <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>

      {/* Participants */}
      <View style={s.participantsList}>
        {split.participants.map((p: any, i: number) => (
          <View key={i} style={s.participantRow}>
            <View style={[
              s.participantAvatar,
              p.settled && { backgroundColor: C.success + "25", borderColor: C.success + "50" },
            ]}>
              <Text style={[s.participantInitial, p.settled && { color: C.success }]}>
                {p.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.participantName, p.settled && { color: C.outline }]}>
                {p.name}
              </Text>
              <Text style={s.participantOwes}>
                {p.settled ? "Paid" : `Owes ${formatINR(p.share)}`}
              </Text>
            </View>
            {!p.settled && !settled ? (
              <TouchableOpacity
                style={s.settleBtn}
                onPress={() => onSettle(split.id, p.name, p.share)}
              >
                <Text style={s.settleBtnText}>Settle</Text>
              </TouchableOpacity>
            ) : p.settled ? (
              <View style={s.paidBadge}>
                <SvgXml xml={checkIcon.replace(/currentColor/g, C.success)} width={12} height={12} />
                <Text style={s.paidText}>{formatINR(p.share)}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={s.splitFooter}>
        <View style={s.footerStat}>
          <Text style={s.footerLabel}>Collected</Text>
          <Text style={[s.footerValue, { color: C.success }]}>
            {formatINR(split.settled_amount)}
          </Text>
        </View>
        <View style={s.footerStat}>
          <Text style={s.footerLabel}>Pending</Text>
          <Text style={[s.footerValue, { color: split.owed_to_you > 0 ? C.error : C.outline }]}>
            {formatINR(split.owed_to_you)}
          </Text>
        </View>
        {!settled && (
          <TouchableOpacity onPress={() => onDelete(split.id)} style={s.deleteBtn}>
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: C.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  addBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },

  // Summary
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginTop: 8, marginBottom: 20 },
  summaryCard: {
    flex: 1, borderRadius: 22, padding: 20, alignItems: "center",
    backgroundColor: C.surfaceHighest + "55", borderWidth: 1,
  },
  summaryLabel: { color: C.outline, fontSize: 9, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  summaryValue: { color: C.onSurface, fontSize: 24, fontWeight: "900", letterSpacing: -1 },

  // List
  listSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionLabel: { color: C.primary, fontSize: 10, fontWeight: "800", letterSpacing: 2.5, marginBottom: 14 },

  // Split Card
  splitCard: {
    backgroundColor: C.surfaceHighest + "44", borderRadius: 22, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: C.outlineVar + "12",
  },
  splitTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  splitTitle: { color: C.onSurface, fontSize: 17, fontWeight: "800" },
  splitDate: { color: C.outline, fontSize: 11, marginTop: 3 },
  splitTotal: { color: C.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  splitCategory: { color: C.outline, fontSize: 9, fontWeight: "700", letterSpacing: 1, marginTop: 3 },

  // Your share highlight
  yourShareRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: C.primary + "10", borderWidth: 1, borderColor: C.primary + "20",
    marginBottom: 14,
  },
  yourShareLabel: { color: C.primary, fontSize: 12, fontWeight: "700" },
  yourShareValue: { color: C.primary, fontSize: 16, fontWeight: "900" },

  // Progress
  progressSection: { marginBottom: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { color: C.outline, fontSize: 11, fontWeight: "600" },
  progressPct: { color: C.onSurfaceVar, fontSize: 11, fontWeight: "700" },
  progressTrack: {
    height: 4, borderRadius: 2, backgroundColor: C.surfaceHigh,
  },
  progressFill: {
    height: 4, borderRadius: 2, backgroundColor: C.success,
  },

  // Participants
  participantsList: { gap: 10, marginBottom: 14 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  participantAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outlineVar + "30",
    alignItems: "center", justifyContent: "center",
  },
  participantInitial: { color: C.onSurfaceVar, fontSize: 14, fontWeight: "800" },
  participantName: { color: C.onSurface, fontSize: 14, fontWeight: "600" },
  participantOwes: { color: C.outline, fontSize: 11, marginTop: 1 },
  settleBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: C.primary + "18", borderWidth: 1, borderColor: C.primary + "35",
  },
  settleBtnText: { color: C.primary, fontSize: 12, fontWeight: "700" },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  paidText: { color: C.success, fontSize: 12, fontWeight: "700" },

  // Footer
  splitFooter: {
    flexDirection: "row", alignItems: "center", gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.outlineVar + "20",
    paddingTop: 12,
  },
  footerStat: { flex: 1 },
  footerLabel: { color: C.outline, fontSize: 10, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  footerValue: { fontSize: 14, fontWeight: "800" },
  deleteBtn: { padding: 8 },
  deleteText: { color: C.error + "88", fontSize: 12, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { color: C.onSurface, fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptySub: { color: C.onSurfaceVar, fontSize: 13, textAlign: "center", lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: "90%",
  },
  modalTitle: { color: C.onSurface, fontSize: 22, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  inputLabel: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 14,
    color: C.onSurface, fontSize: 15, borderWidth: 1, borderColor: C.outlineVar + "20",
  },
  autoHint: { color: C.outline, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  participantsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  addParticipantText: { color: C.primary, fontSize: 13, fontWeight: "700" },
  participantInputRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  removeBtn: { padding: 10 },
  removeBtnText: { color: C.error, fontSize: 16, fontWeight: "700" },

  // Preview
  previewCard: {
    marginTop: 16, padding: 16, borderRadius: 16,
    backgroundColor: C.surfaceHigh + "88", borderWidth: 1, borderColor: C.outlineVar + "15",
  },
  previewTitle: { color: C.outline, fontSize: 9, fontWeight: "700", letterSpacing: 2, marginBottom: 10 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  previewLabel: { color: C.onSurfaceVar, fontSize: 13 },
  previewValue: { color: C.onSurface, fontSize: 13, fontWeight: "700" },

  // Actions
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outlineVar + "30",
  },
  cancelBtnText: { color: C.onSurface, fontSize: 15, fontWeight: "700" },
  createBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.primary },
  createBtnText: { color: C.onPrimary, fontSize: 15, fontWeight: "800" },
});
