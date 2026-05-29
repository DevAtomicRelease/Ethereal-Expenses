/**
 * Settings Screen — Profile / Settings tab.
 *
 * Sections (all stacked vertically):
 *  1. Account  — Personal Info, Email Preferences, Language & Region
 *  2. Security — Password, Two-Factor Auth, Active Sessions
 *  3. Notifications — Push toggle, Daily Digest toggle
 *  4. Sign Out + Version
 *
 * Navigation links to existing sub-screens: goals, thresholds, data-export.
 */
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { SvgXml } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:             "#131313",
  surface:        "#1C1B1B",
  surfaceHigh:    "#2A2A2A",
  surfaceHighest: "#353534",
  primary:        "#CCC989",
  primaryDim:     "#969359",
  onPrimary:      "#333202",
  onSurface:      "#E5E2E1",
  onSurfaceVar:   "#CAC7B7",
  outline:        "#939182",
  outlineVar:     "#48473B",
  error:          "#FFB4AB",
  secondary:      "#C0CAAF",
  secondaryC:     "#434C37",
} as const;

// ─── Inline SVG icons (small, used only here) ─────────────────────────────────
const icon = (xml: string, color: string, size = 22) => (
  <SvgXml xml={xml.replace(/currentColor/g, color)} width={size} height={size} />
);

const ICONS = {
  person: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>`,
  language: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A8.03 8.03 0 015.08 16zm2.95-8H5.08a8.03 8.03 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor"/></svg>`,
  key: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.65 10A5.99 5.99 0 007 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 005.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor"/></svg>`,
  devices: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z" fill="currentColor"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/></svg>`,
  history: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor"/></svg>`,
  importFile: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"/></svg>`,
  privacy: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`,
  report: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/></svg>`,
};

// ─── Chevron Sub-component ────────────────────────────────────────────────────
function Chevron() {
  return icon(ICONS.chevron, C.outlineVar + "88", 20);
}

// ─── Settings Row ─────────────────────────────────────────────────────────────
function SettingsRow({
  iconXml,
  label,
  trailing,
  onPress,
  isLast,
}: {
  iconXml: string;
  label: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, !isLast && styles.rowBorder]}
    >
      <View style={styles.rowLeft}>
        {icon(iconXml, C.onSurfaceVar)}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {trailing ?? <Chevron />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
  isLast,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
      <View style={styles.toggleTextBlock}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: C.surfaceHighest, true: C.primary }}
        thumbColor={value ? C.onPrimary : C.outline}
        ios_backgroundColor={C.surfaceHighest}
      />
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const email = useSelector((s: any) => s.auth?.email ?? "user@ethereal.app");

  const [pushEnabled, setPushEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.heading}>Settings</Text>
          <Text style={styles.subheading}>
            Manage your account and personal preferences.
          </Text>
        </View>

        <SectionLabel text="Account" />
        <View style={styles.card}>
          <SettingsRow
            iconXml={ICONS.person}
            label="User Profile"
            onPress={() => router.push("/(tabs)/profile/user-profile" as any)}
          />
          <SettingsRow
            iconXml={ICONS.language}
            label="Language & Region"
            trailing={
              <View style={styles.rowRight}>
                <Text style={styles.trailingHint}>English (US)</Text>
                <Chevron />
              </View>
            }
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Security ────────────────────────────────────────────────── */}
        <SectionLabel text="Security" />
        <View style={styles.card}>
          <SettingsRow
            iconXml={ICONS.lock}
            label="Password"
            onPress={() => {}}
          />
          <SettingsRow
            iconXml={ICONS.key}
            label="Two-Factor Auth"
            trailing={
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ON</Text>
              </View>
            }
            onPress={() => {}}
          />
          <SettingsRow
            iconXml={ICONS.devices}
            label="Active Sessions"
            onPress={() => {}}
            isLast
          />
        </View>

        {/* ── Data & Tools ─────────────────────────────────────────────── */}
        <SectionLabel text="Data & Tools" />
        <View style={styles.card}>
          <SettingsRow
            iconXml={ICONS.report}
            label="Spending Goals"
            onPress={() => router.push("/(tabs)/profile/goals")}
          />
          <SettingsRow
            iconXml={ICONS.privacy}
            label="Budget Limits"
            onPress={() => router.push("/(tabs)/profile/thresholds" as any)}
          />
          <SettingsRow
            iconXml={ICONS.history}
            label="Reports"
            onPress={() => router.push("/(tabs)/insights/history" as any)}
          />
          <SettingsRow
            iconXml={ICONS.importFile}
            label="Batch Import"
            onPress={() => router.push("/(tabs)/profile/batch-import" as any)}
          />
          <SettingsRow
            iconXml={ICONS.history}
            label="Impulse Watchlist"
            onPress={() => router.push("/(tabs)/profile/impulse-log" as any)}
          />
          <SettingsRow
            iconXml={ICONS.privacy}
            label="Data & Privacy"
            onPress={() => router.push("/(tabs)/profile/data-export")}
            isLast
          />
        </View>

        {/* ── Notifications ───────────────────────────────────────────── */}
        <SectionLabel text="Notifications" />
        <View style={styles.card}>
          <ToggleRow
            title="Push Notifications"
            subtitle="Real-time alerts for spending activity and updates."
            value={pushEnabled}
            onToggle={setPushEnabled}
          />
          <ToggleRow
            title="Daily Digest"
            subtitle="Summarized reports delivered every morning."
            value={digestEnabled}
            onToggle={setDigestEnabled}
            isLast
          />
        </View>

        {/* ── Sign Out ────────────────────────────────────────────────── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out? You'll need to log in again to access your data.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: logout,
                  },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            {icon(ICONS.logout, C.error, 20)}
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>Ethereal Expense · v3.0.0</Text>
        </View>

        {/* Bottom spacer for nav pill */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 100 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 24, paddingTop: 16, marginBottom: 28 },
  heading: {
    color: C.onSurface,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 6,
  },
  subheading: {
    color: C.onSurfaceVar + "B3",
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Section Label ──────────────────────────────────────────────────────────
  sectionLabel: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    paddingHorizontal: 26,
    marginTop: 28,
    marginBottom: 10,
  },

  // ── Glass Card ─────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: C.surfaceHighest + "33",
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
    overflow: "hidden",
  },

  // ── Settings Row ───────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "12",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  rowLabel: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "500",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trailingHint: {
    color: C.onSurfaceVar,
    fontSize: 12,
  },

  // ── Badge ──────────────────────────────────────────────────────────────────
  badge: {
    backgroundColor: C.secondaryC + "33",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: C.secondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // ── Toggle Row ─────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  toggleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "12",
  },
  toggleTextBlock: { flex: 1, marginRight: 16 },
  toggleTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  toggleSub: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logoutSection: {
    alignItems: "center",
    marginTop: 48,
    gap: 14,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutText: {
    color: C.error,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  version: {
    color: C.onSurfaceVar + "66",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
