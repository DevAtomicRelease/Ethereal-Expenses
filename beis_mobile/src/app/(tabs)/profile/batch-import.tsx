/**
 * Batch Import Screen — Premium import wizard within Settings/Profile tab.
 *
 * Layout (from HTML mockup):
 *  1. Header: ← back + "Batch Import"
 *  2. Step Progress Wizard: 4 steps (Method → Map Columns → Review → Confirm)
 *  3. Title: "Select Import Method"
 *  4. Upload Data File card (glass card with icon + description)
 *  5. "Upload Data File" CTA button
 *  6. Help footer
 *
 * Note: This is the step-1 UI. The actual file pick + CSV parse will
 * integrate with `expo-document-picker` in a later phase.
 */
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
const fileIcon = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>`;
const arrowForward = `<svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor"/></svg>`;
const openIcon = `<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/></svg>`;

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = ["Method", "Map Columns", "Review", "Confirm"];

// ═══════════════════════════════════════════════════════════════════════════════
export default function BatchImportScreen() {
  const router = useRouter();
  const [currentStep] = useState(0); // Step 1 = index 0

  const handleUpload = () => {
    Alert.alert(
      "Coming Soon",
      "File upload with CSV/JSON parsing will be available in the next release."
    );
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
          <Text style={s.headerTitle}>Batch Import</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step Wizard ──────────────────────────────────── */}
        <View style={s.wizardSection}>
          {/* Background line */}
          <View style={s.wizardBgLine} />
          {/* Progress line */}
          <View
            style={[
              s.wizardProgressLine,
              { width: `${(currentStep / (STEPS.length - 1)) * 100}%` as any },
            ]}
          />

          {STEPS.map((label, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <View key={label} style={s.stepItem}>
                <View
                  style={[
                    s.stepDot,
                    (isActive || isDone) && s.stepDotActive,
                    !isActive && !isDone && s.stepDotInactive,
                  ]}
                >
                  <Text
                    style={[
                      s.stepDotText,
                      (isActive || isDone) && s.stepDotTextActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    s.stepLabel,
                    (isActive || isDone) && s.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Title Section ────────────────────────────────── */}
        <View style={s.titleSection}>
          <Text style={s.mainTitle}>Select Import Method</Text>
          <Text style={s.mainSub}>
            Choose how you'd like to bring your financial data into BEIS.
          </Text>
        </View>

        {/* ── Upload Card ──────────────────────────────────── */}
        <TouchableOpacity
          style={s.methodCard}
          activeOpacity={0.8}
          onPress={handleUpload}
        >
          <View style={s.methodIconWrap}>
            <SvgXml
              xml={fileIcon.replace(/currentColor/g, C.primary)}
              width={32}
              height={32}
            />
          </View>
          <Text style={s.methodTitle}>Upload Data File</Text>
          <Text style={s.methodDesc}>
            Import entries from a supported file format (CSV, JSON, XML). Best
            for manual exports or archival records.
          </Text>
          <View style={s.methodCta}>
            <Text style={s.methodCtaText}>Get started</Text>
            <SvgXml
              xml={arrowForward.replace(/currentColor/g, C.primary)}
              width={14}
              height={14}
            />
          </View>
        </TouchableOpacity>

        {/* ── CTA Button ───────────────────────────────────── */}
        <View style={s.ctaSection}>
          <TouchableOpacity
            style={s.ctaBtn}
            activeOpacity={0.85}
            onPress={handleUpload}
          >
            <Text style={s.ctaBtnText}>Upload Data File</Text>
          </TouchableOpacity>
        </View>

        {/* ── Help Footer ──────────────────────────────────── */}
        <View style={s.helpFooter}>
          <Text style={s.helpText}>Need help? Visit our support center.</Text>
          <SvgXml
            xml={openIcon.replace(/currentColor/g, C.onSurfaceVar)}
            width={14}
            height={14}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
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
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // ── Wizard ─────────────────────────────────────────────────────────────────
  wizardSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 30,
    paddingVertical: 24,
    position: "relative",
  },
  wizardBgLine: {
    position: "absolute",
    top: 44, // center of the 40px dot
    left: 50,
    right: 50,
    height: 2,
    backgroundColor: C.surfaceHighest,
    zIndex: 0,
  },
  wizardProgressLine: {
    position: "absolute",
    top: 44,
    left: 50,
    height: 2,
    backgroundColor: C.primary,
    zIndex: 1,
  },
  stepItem: {
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: C.primaryDim,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  stepDotInactive: {
    backgroundColor: C.surfaceHighest,
    borderWidth: 1,
    borderColor: C.outlineVar + "50",
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.onSurfaceVar,
  },
  stepDotTextActive: {
    color: C.onPrimary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.onSurfaceVar,
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: C.primary,
  },

  // ── Title ──────────────────────────────────────────────────────────────────
  titleSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 36,
    marginTop: 16,
  },
  mainTitle: {
    color: C.onSurface,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1.5,
    textAlign: "center",
    marginBottom: 10,
  },
  mainSub: {
    color: C.onSurfaceVar,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  // ── Method Card ────────────────────────────────────────────────────────────
  methodCard: {
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 32,
    backgroundColor: C.surfaceHighest + "66",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
    marginBottom: 32,
  },
  methodIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  methodTitle: {
    color: C.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  methodDesc: {
    color: C.onSurfaceVar,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  methodCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  methodCtaText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── CTA ────────────────────────────────────────────────────────────────────
  ctaSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  ctaBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: C.primaryDim,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  ctaBtnText: {
    color: C.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  // ── Help Footer ────────────────────────────────────────────────────────────
  helpFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  helpText: {
    color: C.onSurfaceVar,
    fontSize: 13,
  },
});
