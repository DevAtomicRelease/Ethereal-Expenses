/**
 * Manage Profile / Personal Info Screen
 *
 * Layout:
 *  1. Header: ← back + "Personal Info" + "Save" button
 *  2. Hero: Avatar with camera overlay + name + badge
 *  3. Editable fields: Full Name, Email, Birth Date, Currency
 *  4. Residence display card
 *  5. Security/Encryption notice
 *
 * Data: email from Redux auth state
 */
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { SvgXml } from "react-native-svg";

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
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const cameraIcon = `<svg viewBox="0 0 24 24"><path d="M12 15.2c1.76 0 3.2-1.44 3.2-3.2S13.76 8.8 12 8.8 8.8 10.24 8.8 12s1.44 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z" fill="currentColor"/></svg>`;
const editIcon = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>`;
const mailIcon = `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>`;
const calendarIcon = `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" fill="currentColor"/></svg>`;
const paymentIcon = `<svg viewBox="0 0 24 24"><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" fill="currentColor"/></svg>`;
const locationIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>`;
const shieldIcon = `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/></svg>`;
const lockIcon = `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor"/></svg>`;

// ─── Location options (regions for LLM context) ───────────────────────────────
const REGIONS = [
  "North India", "South India", "West India", "East India", "Central India",
  "Northeast India", "Delhi NCR", "Mumbai Metro", "Bangalore Urban",
  "Hyderabad Metro", "Chennai Metro", "Kolkata Metro", "Pune Metro",
  "Other / Prefer not to say",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
export default function ManageProfileScreen() {
  const router = useRouter();
  const email = useSelector((s: any) => s.auth?.email ?? "user@atomicshift.app");

  // Derive display name from email
  const rawName = email?.split("@")[0]?.replace(/[._]/g, " ") ?? "AtomicShift User";
  const defaultName =
    rawName.charAt(0).toUpperCase() +
    rawName.slice(1).replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Local form state
  const [fullName, setFullName] = useState(defaultName);
  const [birthDate, setBirthDate] = useState("");
  const [dobLocked, setDobLocked] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [region, setRegion] = useState("");
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  const initials = fullName
    ? fullName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AS";

  const handleSave = () => {
    // Lock DOB once it's set
    if (birthDate.trim() && !dobLocked) {
      setDobLocked(true);
    }
    Alert.alert("Profile Saved", "Your personal information has been updated.");
    router.back();
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
          <Text style={s.headerTitle}>Personal Info</Text>
        </View>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Text style={s.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero Profile ─────────────────────────────────── */}
        <View style={s.heroSection}>
          {/* Avatar with camera badge */}
          <View style={s.avatarContainer}>
            <View style={s.avatarRing}>
              <View style={s.avatarInner}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={s.cameraBadge}>
              <SvgXml
                xml={cameraIcon.replace(/currentColor/g, C.onPrimary)}
                width={14}
                height={14}
              />
            </View>
          </View>

          <Text style={s.heroName}>{fullName}</Text>
          <Text style={s.heroBadge}>ATOMICSHIFT MEMBER</Text>
        </View>

        {/* ── Form Fields ──────────────────────────────────── */}
        <View style={s.fieldsSection}>
          {/* Full Name */}
          <View style={s.fieldCard}>
            <View style={s.fieldContent}>
              <View style={s.fieldTextBlock}>
                <Text style={s.fieldLabel}>FULL NAME</Text>
                <TextInput
                  style={s.fieldInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={C.outlineVar + "88"}
                />
              </View>
              <SvgXml
                xml={editIcon.replace(/currentColor/g, C.onSurfaceVar + "66")}
                width={18}
                height={18}
              />
            </View>
          </View>

          {/* Email — read-only, set at registration */}
          <View style={[s.fieldCard, s.fieldLocked]}>
            <View style={s.fieldContent}>
              <View style={s.fieldTextBlock}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                  <View style={s.lockBadge}>
                    <SvgXml xml={lockIcon.replace(/currentColor/g, C.primary)} width={8} height={8} />
                    <Text style={s.lockBadgeText}>LOCKED</Text>
                  </View>
                </View>
                <Text style={[s.fieldInput, { color: C.onSurfaceVar }]}>{email}</Text>
                <Text style={s.fieldHint}>Set at registration and cannot be changed.</Text>
              </View>
              <SvgXml
                xml={mailIcon.replace(/currentColor/g, C.onSurfaceVar + "33")}
                width={18}
                height={18}
              />
            </View>
          </View>

          {/* Birth Date + Currency — stacked on mobile */}
          <View style={s.twoColRow}>
            <View style={[s.fieldCard, { flex: 1 }, dobLocked && s.fieldLocked]}>
              <View style={s.fieldContent}>
                <View style={s.fieldTextBlock}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={s.fieldLabel}>BIRTH DATE</Text>
                    {dobLocked && (
                      <View style={s.lockBadge}>
                        <SvgXml xml={lockIcon.replace(/currentColor/g, C.primary)} width={8} height={8} />
                        <Text style={s.lockBadgeText}>LOCKED</Text>
                      </View>
                    )}
                  </View>
                  {dobLocked ? (
                    <Text style={[s.fieldInput, { color: C.onSurfaceVar }]}>{birthDate}</Text>
                  ) : (
                    <TextInput
                      style={s.fieldInput}
                      value={birthDate}
                      onChangeText={setBirthDate}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={C.outlineVar + "88"}
                    />
                  )}
                </View>
                <SvgXml
                  xml={calendarIcon.replace(/currentColor/g, dobLocked ? C.onSurfaceVar + "33" : C.onSurfaceVar + "66")}
                  width={18}
                  height={18}
                />
              </View>
              {!dobLocked && (
                <Text style={s.fieldHint}>Once saved, date of birth cannot be changed.</Text>
              )}
            </View>

            <View style={[s.fieldCard, { flex: 1 }]}>
              <View style={s.fieldContent}>
                <View style={s.fieldTextBlock}>
                  <Text style={s.fieldLabel}>CURRENCY</Text>
                  <View style={s.currencyRow}>
                    <SvgXml
                      xml={paymentIcon.replace(/currentColor/g, C.primary)}
                      width={16}
                      height={16}
                    />
                    <Text style={s.currencyText}>{currency}</Text>
                  </View>
                </View>
                <SvgXml
                  xml={`<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/></svg>`.replace(
                    /currentColor/g,
                    C.onSurfaceVar + "66"
                  )}
                  width={18}
                  height={18}
                />
              </View>
            </View>
          </View>

          {/* Region Card — helps LLM understand geographic spending context */}
          <View style={s.residenceCard}>
            {/* Decorative map-like gradient block */}
            <View style={s.residenceMap}>
              <View style={s.residenceMapOverlay} />
              <View style={s.residenceMapDots}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.mapDot,
                      {
                        left: `${15 + Math.random() * 70}%` as any,
                        top: `${10 + Math.random() * 60}%` as any,
                        opacity: 0.15 + Math.random() * 0.25,
                        width: 3 + Math.random() * 4,
                        height: 3 + Math.random() * 4,
                      },
                    ]}
                  />
                ))}
                <View style={s.mapCenter}>
                  <SvgXml
                    xml={locationIcon.replace(/currentColor/g, C.primary + "AA")}
                    width={20}
                    height={20}
                  />
                </View>
              </View>
            </View>

            <View style={s.residenceContent}>
              <TouchableOpacity
                style={s.fieldContent}
                activeOpacity={0.7}
                onPress={() => setShowRegionPicker(!showRegionPicker)}
              >
                <View style={s.fieldTextBlock}>
                  <Text style={s.fieldLabel}>REGION</Text>
                  <Text style={[s.fieldInput, !region && { color: C.outlineVar + "88" }]}>
                    {region || "Select your region"}
                  </Text>
                  <Text style={s.fieldHint}>
                    Helps AI analyze spending patterns for your area.
                  </Text>
                </View>
                <SvgXml
                  xml={locationIcon.replace(/currentColor/g, C.onSurfaceVar + "66")}
                  width={18}
                  height={18}
                />
              </TouchableOpacity>

              {showRegionPicker && (
                <View style={s.regionList}>
                  {REGIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[s.regionItem, region === r && s.regionItemActive]}
                      onPress={() => { setRegion(r); setShowRegionPicker(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.regionItemText, region === r && s.regionItemTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Security Badge ───────────────────────────────── */}
        <View style={s.securityCard}>
          <View style={s.securityIconWrap}>
            <SvgXml
              xml={shieldIcon.replace(/currentColor/g, C.primary)}
              width={24}
              height={24}
            />
          </View>
          <View style={s.securityTextBlock}>
            <Text style={s.securityTitle}>Data Encrypted</Text>
            <Text style={s.securitySub}>
              Your personal information is protected with bank-grade AES-256
              encryption within the AtomicShift vault.
            </Text>
          </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.onSurface,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  saveText: {
    color: C.primary,
    fontSize: 17,
    fontWeight: "800",
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 36,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: C.outlineVar + "50",
    overflow: "hidden",
  },
  avatarInner: {
    flex: 1,
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.primary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  heroName: {
    color: C.onSurface,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroBadge: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },

  // ── Fields ─────────────────────────────────────────────────────────────────
  fieldsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  fieldCard: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  fieldContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fieldTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  fieldLabel: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  fieldInput: {
    color: C.onSurface,
    fontSize: 17,
    fontWeight: "600",
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },

  // Currency
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyText: {
    color: C.onSurface,
    fontSize: 17,
    fontWeight: "600",
  },

  // Two columns
  twoColRow: {
    flexDirection: "row",
    gap: 12,
  },

  // ── Residence ──────────────────────────────────────────────────────────────
  residenceCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
    backgroundColor: C.surfaceHighest + "33",
  },
  residenceMap: {
    height: 100,
    backgroundColor: C.surfaceHigh,
    position: "relative",
    overflow: "hidden",
  },
  residenceMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.surface,
    opacity: 0.5,
  },
  residenceMapDots: {
    ...StyleSheet.absoluteFillObject,
  },
  mapDot: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  mapCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -10,
    marginTop: -10,
  },
  residenceContent: {
    padding: 20,
    marginTop: -24,
  },

  // ── Security Badge ─────────────────────────────────────────────────────────
  securityCard: {
    marginHorizontal: 20,
    marginTop: 36,
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.primary + "0D",
    borderWidth: 1,
    borderColor: C.primary + "30",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  securityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTextBlock: {
    flex: 1,
  },
  securityTitle: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  securitySub: {
    color: C.onSurfaceVar,
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Locked field ────────────────────────────────────────────────────────────
  fieldLocked: {
    opacity: 0.7,
    borderColor: C.outlineVar + "08",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primary + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockBadgeText: {
    color: C.primary,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },
  fieldHint: {
    color: C.onSurfaceVar + "66",
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },

  // ── Region picker ──────────────────────────────────────────────────────────
  regionList: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVar + "15",
    paddingTop: 8,
  },
  regionItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVar + "0A",
  },
  regionItemActive: {
    backgroundColor: C.primary + "12",
    borderRadius: 10,
    borderBottomWidth: 0,
  },
  regionItemText: {
    color: C.onSurfaceVar,
    fontSize: 14,
    fontWeight: "500",
  },
  regionItemTextActive: {
    color: C.primary,
    fontWeight: "700",
  },
});
