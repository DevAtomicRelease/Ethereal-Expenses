/**
 * User Profile Screen — Main profile page with avatar, total spend,
 * bento cards, and action rows. "Manage Profile" → manage-profile.tsx
 */
import React, { useMemo } from "react";
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { SvgXml } from "react-native-svg";
import { useAuth } from "@/hooks/useAuth";
import { useExpenses } from "@/api/queries/useExpenses";
import { formatINR } from "@/utils/currency";

const C = {
  bg: "#131313", surface: "#1C1B1B", surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534", primary: "#CCC989", primaryDim: "#969359",
  onPrimary: "#333202", onSurface: "#E5E2E1", onSurfaceVar: "#CAC7B7",
  outline: "#939182", outlineVar: "#48473B", error: "#FFB4AB",
} as const;

const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const chevronRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>`;
const accountIcon = `<svg viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" fill="currentColor"/></svg>`;
const fingerprintIcon = `<svg viewBox="0 0 24 24"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21z" fill="currentColor"/></svg>`;
const targetIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" fill="currentColor"/></svg>`;
const notifIcon = `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/></svg>`;
const exportIcon = `<svg viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" fill="currentColor"/></svg>`;
const logoutIcon = `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/></svg>`;
const checkCircle = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`;
const verifiedIcon = `<svg viewBox="0 0 24 24"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5 12 21.04l3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" fill="currentColor"/></svg>`;
const arrowForward = `<svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor"/></svg>`;

export default function UserProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const email = useSelector((s: any) => s.auth?.email ?? "user@ethereal.app");
  const { data: expenseData } = useExpenses({ page: 1, limit: 500 });

  const totalSpend = useMemo(() => {
    const expenses = (expenseData as any)?.transactions ?? (expenseData as any)?.expenses ?? [];
    return expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  }, [expenseData]);

  const initials = email ? email.slice(0, 2).toUpperCase() : "EE";
  const userName = email?.split("@")[0]?.replace(/[._]/g, " ") ?? "Ethereal User";
  const displayName =
    userName.charAt(0).toUpperCase() +
    userName.slice(1).replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroSection}>
          <View style={s.avatarOuter}>
            <View style={s.avatarInner}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroBadge}>ETHEREAL MEMBER</Text>
          <TouchableOpacity style={s.manageBtn} activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/profile/manage-profile" as any)}>
            <Text style={s.manageBtnText}>Manage Profile</Text>
            <SvgXml xml={arrowForward.replace(/currentColor/g, C.onPrimary)} width={16} height={16} />
          </TouchableOpacity>
        </View>

        {/* Total Spend */}
        <View style={s.wealthCard}>
          <Text style={s.wealthLabel}>TOTAL RECORDED SPEND</Text>
          <Text style={s.wealthAmount}>{formatINR(totalSpend)}</Text>
          <View style={s.wealthBadgeRow}>
            <View style={s.wealthBadge}>
              <View style={s.wealthDot} />
              <Text style={s.wealthBadgeText}>TRACKING ACTIVE</Text>
            </View>
            <View style={s.verifiedBadge}>
              <SvgXml xml={verifiedIcon.replace(/currentColor/g, C.outline)} width={14} height={14} />
              <Text style={s.verifiedText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* Bento Cards */}
        <View style={s.bentoRow}>
          <View style={s.bentoCard}>
            <View style={s.bentoIconWrap}>
              <SvgXml xml={accountIcon.replace(/currentColor/g, C.primary)} width={22} height={22} />
            </View>
            <Text style={s.bentoTitle}>Total Spend</Text>
            <Text style={s.bentoSub}>All recorded expenses</Text>
            <Text style={s.bentoValue}>{formatINR(totalSpend)}</Text>
          </View>
          <View style={s.bentoCard}>
            <View style={[s.bentoIconWrap, { backgroundColor: C.surfaceHigh }]}>
              <SvgXml xml={fingerprintIcon.replace(/currentColor/g, C.outline)} width={22} height={22} />
            </View>
            <Text style={s.bentoTitle}>Security Level</Text>
            <Text style={s.bentoSub}>Password Protected</Text>
            <View style={s.securityRow}>
              <SvgXml xml={checkCircle.replace(/currentColor/g, C.primary)} width={16} height={16} />
              <Text style={s.securityText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Action Rows */}
        <View style={s.actionsSection}>
          <TouchableOpacity style={s.actionCard} activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/profile/goals")}>
            <View style={s.actionLeft}>
              <View style={s.actionIconWrap}>
                <SvgXml xml={targetIcon.replace(/currentColor/g, C.primary)} width={22} height={22} />
              </View>
              <Text style={s.actionLabel}>Spending Goals</Text>
            </View>
            <SvgXml xml={chevronRight.replace(/currentColor/g, C.outline + "88")} width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/profile/thresholds" as any)}>
            <View style={s.actionLeft}>
              <View style={s.actionIconWrap}>
                <SvgXml xml={notifIcon.replace(/currentColor/g, C.primary)} width={22} height={22} />
              </View>
              <Text style={s.actionLabel}>Budget Limits</Text>
            </View>
            <SvgXml xml={chevronRight.replace(/currentColor/g, C.outline + "88")} width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/profile/data-export")}>
            <View style={s.actionLeft}>
              <View style={s.actionIconWrap}>
                <SvgXml xml={exportIcon.replace(/currentColor/g, C.primary)} width={22} height={22} />
              </View>
              <Text style={s.actionLabel}>Export Data</Text>
            </View>
            <SvgXml xml={chevronRight.replace(/currentColor/g, C.outline + "88")} width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity style={s.logoutCard} activeOpacity={0.7} onPress={logout}>
            <SvgXml xml={logoutIcon.replace(/currentColor/g, C.error)} width={22} height={22} />
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 },
  backBtn: { padding: 6 },
  heroSection: { alignItems: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  avatarOuter: {
    width: 130, height: 130, borderRadius: 65, marginBottom: 18, padding: 3,
    backgroundColor: C.primaryDim,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 30 },
      android: { elevation: 8 },
    }),
  },
  avatarInner: { flex: 1, borderRadius: 62, backgroundColor: C.bg, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.primary, fontSize: 42, fontWeight: "800", letterSpacing: -1 },
  heroName: { color: C.onSurface, fontSize: 28, fontWeight: "800", letterSpacing: -1, marginBottom: 6 },
  heroBadge: { color: C.primary, fontSize: 10, fontWeight: "700", letterSpacing: 3, marginBottom: 20 },
  manageBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: 14, backgroundColor: C.primary,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  manageBtnText: { color: C.onPrimary, fontSize: 14, fontWeight: "800" },
  wealthCard: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 32, padding: 28,
    backgroundColor: C.surfaceHighest + "66", borderWidth: 1, borderColor: C.outlineVar + "10", alignItems: "center",
  },
  wealthLabel: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 3, marginBottom: 10 },
  wealthAmount: { color: C.onSurface, fontSize: 42, fontWeight: "800", letterSpacing: -2, marginBottom: 18 },
  wealthBadgeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  wealthBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, backgroundColor: C.primary + "15", borderWidth: 1, borderColor: C.primary + "30",
  },
  wealthDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  wealthBadgeText: { color: C.primary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.outlineVar + "30",
  },
  verifiedText: { color: C.outline, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  bentoRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  bentoCard: {
    flex: 1, backgroundColor: C.surfaceHighest + "66", borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: C.outlineVar + "10", minHeight: 180, justifyContent: "space-between",
  },
  bentoIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  bentoTitle: { color: C.onSurface, fontSize: 17, fontWeight: "800", marginBottom: 3 },
  bentoSub: { color: C.outline, fontSize: 12, marginBottom: 14 },
  bentoValue: { color: C.onSurface, fontSize: 20, fontWeight: "800" },
  securityRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  securityText: { color: C.primary, fontSize: 13, fontWeight: "700" },
  actionsSection: { paddingHorizontal: 20, gap: 10 },
  actionCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surfaceHighest + "66", borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: C.outlineVar + "10",
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.primary + "15", alignItems: "center", justifyContent: "center" },
  actionLabel: { color: C.onSurface, fontSize: 17, fontWeight: "800" },
  logoutCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.error + "15", borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: C.error + "30", marginTop: 4,
  },
  logoutText: { color: C.error, fontSize: 17, fontWeight: "800" },
});
