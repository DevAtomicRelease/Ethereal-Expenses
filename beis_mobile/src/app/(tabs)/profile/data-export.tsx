import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import Svg, { Rect, Circle, Line, Path } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";

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
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const shareIcon = `<svg viewBox="0 0 24 24"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" fill="currentColor"/></svg>`;
const receiptIcon = `<svg viewBox="0 0 24 24"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" fill="currentColor"/></svg>`;
const psychIcon = `<svg viewBox="0 0 24 24"><path d="M13 8.57a1.43 1.43 0 100-2.86 1.43 1.43 0 000 2.86zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2a.5.5 0 00.4.8h1.5v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7z" fill="currentColor"/></svg>`;
const chevronRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`;
const deleteIcon = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>`;
const shieldIcon = `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`;
const warningIcon = `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/></svg>`;

// ═══════════════════════════════════════════════════════════════════════════════
export default function DataPrivacyScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleExportTransactions = () => {
    Alert.alert(
      "Export Transactions",
      "Your transaction history export will be prepared. This may take a moment.",
      [{ text: "Cancel", style: "cancel" }, { text: "Export", onPress: () => {} }]
    );
  };

  const handleExportMemory = () => {
    Alert.alert(
      "Export Spending Reports",
      "Your spending reports and analysis data will be exported as an encrypted archive.",
      [{ text: "Cancel", style: "cancel" }, { text: "Export", onPress: () => {} }]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "⚠️ Delete All Data",
      "This will permanently delete your account and all associated data including transactions, spending reports, and insights.\n\nThis action is IRREVERSIBLE.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setDeletePassword("");
            setDeleteError("");
            setShowDeleteModal(true);
          },
        },
      ]
    );
  };

  const confirmDelete = () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    if (deletePassword.length < 8) {
      setDeleteError("Password must be at least 8 characters.");
      return;
    }
    // Close modal and proceed with deletion
    setShowDeleteModal(false);
    setDeletePassword("");
    logout();
  };

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
          <Text style={s.headerTitle}>Data & Privacy</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title Section ────────────────────────────────── */}
        <View style={s.titleSection}>
          <Text style={s.mainTitle}>Data & Privacy</Text>
          <Text style={s.mainSub}>
            Manage your data and control how your financial information
            is stored within Ethereal Expense.
          </Text>
        </View>

        {/* ── Export Data Card ──────────────────────────────── */}
        <View style={s.exportCard}>
          <View style={s.exportHeader}>
            <View style={s.exportIconWrap}>
              <SvgXml
                xml={shareIcon.replace(/currentColor/g, C.primary)}
                width={20}
                height={20}
              />
            </View>
            <Text style={s.exportTitle}>Export Data</Text>
          </View>

          <Text style={s.exportDesc}>
            Download a copy of your data. This process may take a few
            minutes depending on your data size.
          </Text>

          {/* Export Transaction History */}
          <TouchableOpacity
            style={s.exportRow}
            activeOpacity={0.7}
            onPress={handleExportTransactions}
          >
            <View style={s.exportRowLeft}>
              <SvgXml
                xml={receiptIcon.replace(/currentColor/g, C.primary + "B3")}
                width={22}
                height={22}
              />
              <Text style={s.exportRowText}>Export Transaction History</Text>
            </View>
            <SvgXml
              xml={chevronRight.replace(/currentColor/g, C.onSurfaceVar)}
              width={20}
              height={20}
            />
          </TouchableOpacity>

          {/* Export Behavioral Memory */}
          <TouchableOpacity
            style={[s.exportRow, { marginTop: 10 }]}
            activeOpacity={0.7}
            onPress={handleExportMemory}
          >
            <View style={s.exportRowLeft}>
              <SvgXml
                xml={psychIcon.replace(/currentColor/g, C.primary + "B3")}
                width={22}
                height={22}
              />
              <Text style={s.exportRowText}>Export Spending Reports</Text>
            </View>
            <SvgXml
              xml={chevronRight.replace(/currentColor/g, C.onSurfaceVar)}
              width={20}
              height={20}
            />
          </TouchableOpacity>
        </View>

        {/* ── Secure Protocol Banner ───────────────────────── */}
        <View style={s.bannerCard}>
          {/* Decorative SVG background */}
          <View style={s.bannerSvgWrap}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 320 140"
              style={{ position: "absolute" }}
            >
              {/* Abstract geometric pattern */}
              <Rect x="20" y="20" width="60" height="60" rx="8" fill={C.primary + "08"} stroke={C.primary + "15"} strokeWidth={0.5} />
              <Rect x="100" y="40" width="40" height="40" rx="6" fill={C.primaryDim + "0A"} stroke={C.primary + "10"} strokeWidth={0.5} />
              <Rect x="200" y="10" width="80" height="80" rx="12" fill={C.primary + "06"} stroke={C.primary + "0D"} strokeWidth={0.5} />
              <Circle cx="260" cy="110" r="20" fill={C.primary + "08"} stroke={C.primary + "15"} strokeWidth={0.5} />
              <Line x1="0" y1="70" x2="320" y2="70" stroke={C.primary + "0A"} strokeWidth={0.3} strokeDasharray="4,8" />
              <Line x1="160" y1="0" x2="160" y2="140" stroke={C.primary + "08"} strokeWidth={0.3} strokeDasharray="4,8" />
              {/* Prism-like triangles */}
              <Path d="M140,100 L160,60 L180,100 Z" fill="none" stroke={C.primary + "15"} strokeWidth={0.5} />
              <Path d="M50,120 L70,90 L90,120 Z" fill="none" stroke={C.primaryDim + "12"} strokeWidth={0.5} />
            </Svg>
          </View>

          {/* Gradient overlay */}
          <View style={s.bannerGradient} />

          {/* Content */}
          <View style={s.bannerContent}>
            <View style={s.bannerShieldRow}>
              <SvgXml
                xml={shieldIcon.replace(/currentColor/g, C.primary)}
                width={20}
                height={20}
              />
              <Text style={s.bannerTitle}>Private and Secure</Text>
            </View>
            <Text style={s.bannerSub}>FULLY ENCRYPTED DATA</Text>
          </View>
        </View>

        {/* ── Danger Zone ──────────────────────────────────── */}
        <View style={s.dangerCard}>
          <Text style={s.dangerTitle}>Danger Zone</Text>
          <Text style={s.dangerDesc}>
            Permanently remove your account and all associated data. This
            action is irreversible.
          </Text>

          <TouchableOpacity
            style={s.dangerBtn}
            activeOpacity={0.7}
            onPress={handleDeleteAll}
          >
            <SvgXml
              xml={deleteIcon.replace(/currentColor/g, C.error)}
              width={20}
              height={20}
            />
            <Text style={s.dangerBtnText}>Delete All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Password Confirmation Modal ──────────────────── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {/* Warning icon */}
            <View style={s.modalIconWrap}>
              <SvgXml
                xml={warningIcon.replace(/currentColor/g, C.error)}
                width={28}
                height={28}
              />
            </View>

            <Text style={s.modalTitle}>Confirm Account Deletion</Text>
            <Text style={s.modalDesc}>
              Enter your password to permanently delete all data. This cannot be
              undone.
            </Text>

            {/* Password input */}
            <TextInput
              style={s.modalInput}
              placeholder="Enter your password"
              placeholderTextColor={C.outlineVar + "88"}
              secureTextEntry
              value={deletePassword}
              onChangeText={(t) => {
                setDeletePassword(t);
                if (deleteError) setDeleteError("");
              }}
              autoFocus
            />

            {/* Error */}
            {deleteError ? (
              <Text style={s.modalError}>{deleteError}</Text>
            ) : null}

            {/* Buttons */}
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalDeleteBtn}
                onPress={confirmDelete}
                activeOpacity={0.85}
              >
                <Text style={s.modalDeleteText}>Delete Everything</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // ── Title Section ──────────────────────────────────────────────────────────
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  mainTitle: {
    color: C.onSurface,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  mainSub: {
    color: C.onSurfaceVar + "CC",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },

  // ── Export Card ────────────────────────────────────────────────────────────
  exportCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 28,
    backgroundColor: C.surface + "99",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
    marginBottom: 20,
  },
  exportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  exportTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  exportDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 22,
  },
  exportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
  },
  exportRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  exportRowText: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Banner ─────────────────────────────────────────────────────────────────
  bannerCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    height: 160,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.surface,
    marginBottom: 20,
  },
  bannerSvgWrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  bannerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: C.bg,
    opacity: 0.7,
  },
  bannerContent: {
    position: "absolute",
    bottom: 20,
    left: 24,
    zIndex: 10,
  },
  bannerShieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  bannerTitle: {
    color: C.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
    marginLeft: 28,
  },

  // ── Danger Zone ────────────────────────────────────────────────────────────
  dangerCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 28,
    backgroundColor: C.errorContainer + "0D",
    borderWidth: 1,
    borderColor: C.errorContainer + "1A",
  },
  dangerTitle: {
    color: C.error,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  dangerDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 24,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: C.errorContainer + "1A",
    borderWidth: 1,
    borderColor: C.errorContainer + "4D",
  },
  dangerBtnText: {
    color: C.error,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.errorContainer + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  modalInput: {
    width: "100%",
    backgroundColor: C.surfaceHighest + "66",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: C.onSurface,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
    marginBottom: 8,
  },
  modalError: {
    color: C.error,
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 16,
    marginLeft: 4,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.surfaceHighest + "66",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  modalCancelText: {
    color: C.onSurfaceVar,
    fontSize: 15,
    fontWeight: "700",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.errorContainer + "33",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.errorContainer + "66",
  },
  modalDeleteText: {
    color: C.error,
    fontSize: 15,
    fontWeight: "800",
  },
});
