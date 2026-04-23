/**
 * Identity Screen — Premium financial identity dashboard.
 *
 * Layout (from HTML mockup):
 *  1. Header: fingerprint icon + "IDENTITY" + avatar
 *  2. Identity Trust Score: concentric animated rings + large score + "ENCRYPTED" badge
 *  3. Metric Cards (bento): Confidence, Self-Control, Stability
 *  4. Global Verification Map: decorative SVG with pulse dots
 *
 * Data: useIdentity() → confidence, self_control, stability, spending_patterns
 */
import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { SvgXml } from "react-native-svg";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { useIdentity } from "@/api/queries/useIdentity";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#353534",
  surfaceLowest: "#0E0E0E",
  primary: "#CCC989",
  primaryDim: "#969359",
  onPrimary: "#333202",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outline: "#939182",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  secondary: "#C0CAAF",
  secondaryDim: "#434C37",
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const backArrow = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;
const fingerprintIcon = `<svg viewBox="0 0 24 24"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39s-4.66 1.97-4.66 4.39c0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-4.91-1.31-7.78-6.15-7.78-9.64 0-2.42 2.02-4.39 4.5-4.39s4.5 1.97 4.5 4.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-1.87-1.57-3.39-3.5-3.39s-3.5 1.52-3.5 3.39c0 3.03 2.56 7.4 6.78 8.53.27.07.43.35.35.62-.05.22-.25.37-.47.37z" fill="currentColor"/></svg>`;
const psychIcon = `<svg viewBox="0 0 24 24"><path d="M13 8.57a1.43 1.43 0 100-2.86 1.43 1.43 0 000 2.86zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2a.5.5 0 00.4.8h1.5v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39a.19.19 0 01.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.01-.26.02-.39l-.83-.66a.19.19 0 01-.05-.25l.8-1.39c.05-.09.15-.12.24-.09l.99.4c.21-.16.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l.99-.4c.09-.04.19 0 .24.09l.8 1.39c.05.09.03.19-.05.25l-.83.66c.01.13.03.26.03.39z" fill="currentColor"/></svg>`;
const selfIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`;
const analyticsIcon = `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/></svg>`;

// ─── Pulse Dot Component ──────────────────────────────────────────────────────
function PulseDot({ top, left }: { top: string; left: string }) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        ss.pulseDot,
        { top: top as any, left: left as any, opacity: pulse },
      ]}
    >
      <View style={ss.pulseDotInner} />
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function IdentityScreen() {
  const router = useRouter();
  const email = useSelector((s: any) => s.auth?.email ?? "user@atomicshift.app");
  const { data } = useIdentity();

  const confidence = data?.identity_confidence ?? 0;
  const selfControl = data?.self_control_score ?? 0;
  const stability = data?.identity_stability ?? "unknown";
  const patterns = data?.identity_traits ?? [];

  // Trust score = weighted average
  const trustScore = ((confidence * 0.4 + selfControl * 0.35 + (stability === "stable" ? 0.9 : stability === "shifting" ? 0.5 : 0.2) * 0.25) * 100).toFixed(1);

  // Stability label
  const stabilityLabel =
    stability === "stable" ? "STABLE" :
    stability === "shifting" ? "MODERATE" : "VOLATILE";

  const initials = email ? email.slice(0, 2).toUpperCase() : "BE";

  // Ring pulse animation
  const ringPulse = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 0.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0.08, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <SvgXml xml={backArrow.replace(/currentColor/g, C.primary)} width={22} height={22} />
          </TouchableOpacity>
          <SvgXml xml={fingerprintIcon.replace(/currentColor/g, C.primary)} width={22} height={22} />
          <Text style={s.headerTitle}>IDENTITY</Text>
        </View>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{initials}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity Score Section ────────────────────────── */}
        <View style={s.scoreSection}>
          {/* Concentric rings */}
          <View style={s.ringsWrap}>
            {/* Outer ring (animated pulse) */}
            <Animated.View style={[s.ring, s.ringOuter, { opacity: ringPulse }]} />
            {/* Middle ring */}
            <View style={[s.ring, s.ringMiddle]} />
            {/* Inner ring (dashed) */}
            <View style={[s.ring, s.ringInner]} />

            {/* Score content */}
            <View style={s.scoreCenter}>
              <SvgXml
                xml={`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1"/></svg>`.replace(/currentColor/g, C.primary)}
                width={48}
                height={48}
              />
              <Text style={s.scoreValue}>{trustScore}</Text>
              <Text style={s.scoreLabel}>IDENTITY TRUST SCORE</Text>
            </View>

            {/* ENCRYPTED badge */}
            <View style={s.encryptedBadge}>
              <Text style={s.encryptedText}>ENCRYPTED</Text>
            </View>
          </View>
        </View>

        {/* ── Key Metrics Cards ────────────────────────────── */}
        <View style={s.metricsSection}>
          {/* Confidence */}
          <View style={s.metricCard}>
            <View style={s.metricTop}>
              <SvgXml xml={psychIcon.replace(/currentColor/g, C.primary + "99")} width={22} height={22} />
              <Text style={s.metricIndex}>Metric 01</Text>
            </View>
            <View style={s.metricBody}>
              <Text style={s.metricLabel}>CONFIDENCE</Text>
              <Text style={s.metricValue}>{Math.round(confidence * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${confidence * 100}%` as any }]} />
            </View>
          </View>

          {/* Self-Control */}
          <View style={s.metricCard}>
            <View style={s.metricTop}>
              <SvgXml xml={selfIcon.replace(/currentColor/g, C.primary + "99")} width={22} height={22} />
              <Text style={s.metricIndex}>Metric 02</Text>
            </View>
            <View style={s.metricBody}>
              <Text style={s.metricLabel}>SELF-CONTROL</Text>
              <Text style={s.metricValue}>{Math.round(selfControl * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${selfControl * 100}%` as any }]} />
            </View>
          </View>

          {/* Stability */}
          <View style={[s.metricCard, { borderWidth: 1, borderColor: C.primary + "0D" }]}>
            <View style={s.metricTop}>
              <SvgXml xml={analyticsIcon.replace(/currentColor/g, C.secondary)} width={22} height={22} />
              <Text style={s.metricIndex}>Metric 03</Text>
            </View>
            <View style={s.metricBody}>
              <Text style={s.metricLabel}>STABILITY</Text>
              <Text style={[s.metricValue, { color: C.secondary }]}>{stabilityLabel}</Text>
            </View>
            <View style={s.stabilityRow}>
              <View style={s.stabilityDot} />
              <Text style={s.stabilityText}>Normal Parameters</Text>
            </View>
          </View>
        </View>

        {/* ── Spending Patterns ─────────────────────────────── */}
        {patterns.length > 0 && (
          <View style={s.patternsSection}>
            <Text style={s.patternsSectionTitle}>SPENDING PATTERNS</Text>
            <View style={s.patternsWrap}>
              {patterns.map((p: string, i: number) => (
                <View key={i} style={s.patternChip}>
                  <Text style={s.patternChipText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Global Verification Map ──────────────────────── */}
        <View style={s.mapSection}>
          <Text style={s.mapSectionTitle}>GLOBAL VERIFICATION MAP</Text>
          <View style={s.mapCard}>
            {/* Decorative SVG grid */}
            <View style={s.mapSvgWrap}>
              <Svg width="100%" height="100%" viewBox="0 0 300 150" style={{ position: "absolute", opacity: 0.1 }}>
                <Path d="M60,60 Q90,30 120,60 T180,60" fill="none" stroke={C.primary} strokeWidth={0.5} />
                <Path d="M180,100 Q210,70 240,100 T280,100" fill="none" stroke={C.primary} strokeWidth={0.5} />
                <Circle cx="90" cy="70" r={1.5} fill={C.primary} />
                <Circle cx="210" cy="90" r={1.5} fill={C.primary} />
                <Circle cx="150" cy="50" r={1.5} fill={C.primary} />
                <Circle cx="250" cy="60" r={1.5} fill={C.primary} />
                <Line x1="0" y1="75" x2="300" y2="75" stroke={C.primary} strokeWidth={0.2} strokeDasharray="2,4" />
                <Line x1="150" y1="0" x2="150" y2="150" stroke={C.primary} strokeWidth={0.2} strokeDasharray="2,4" />
              </Svg>
            </View>

            {/* Pulsing dots */}
            <PulseDot top="30%" left="25%" />
            <PulseDot top="60%" left="65%" />
            <PulseDot top="45%" left="48%" />

            {/* Center label */}
            <View style={s.mapCenterLabel}>
              <Text style={s.mapLabelTitle}>ACTIVE SECURE NODES</Text>
              <Text style={s.mapLabelSub}>
                End-to-end encrypted mesh network active across regions
              </Text>
            </View>
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
const RING_SIZE = 220;

const ss = StyleSheet.create({
  pulseDot: {
    position: "absolute",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
});

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
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 4,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.outlineVar + "50",
    backgroundColor: C.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Score Section ──────────────────────────────────────────────────────────
  scoreSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  ringsWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
  },
  ringOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderWidth: 4,
    borderColor: C.primary + "1A",
  },
  ringMiddle: {
    width: RING_SIZE - 32,
    height: RING_SIZE - 32,
    borderWidth: 2,
    borderColor: C.primary + "33",
  },
  ringInner: {
    width: RING_SIZE - 64,
    height: RING_SIZE - 64,
    borderWidth: 1,
    borderColor: C.primary + "4D",
    borderStyle: "dashed",
  },
  scoreCenter: {
    alignItems: "center",
    zIndex: 10,
  },
  scoreValue: {
    color: C.onSurface,
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -2,
    marginTop: -4,
  },
  scoreLabel: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 3,
    marginTop: 4,
  },
  encryptedBadge: {
    position: "absolute",
    top: 0,
    right: -8,
    backgroundColor: C.surfaceHighest + "BB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  encryptedText: {
    color: C.secondary,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
  },

  // ── Metrics Cards ──────────────────────────────────────────────────────────
  metricsSection: {
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 32,
  },
  metricCard: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  metricIndex: {
    color: C.outline,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  metricBody: {
    marginBottom: 18,
  },
  metricLabel: {
    color: C.onSurfaceVar,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 6,
  },
  metricValue: {
    color: C.onSurface,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: C.surfaceHighest,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.primary,
    borderRadius: 2,
  },

  // Stability
  stabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.secondary,
    ...Platform.select({
      ios: {
        shadowColor: C.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  stabilityText: {
    color: C.secondary + "CC",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ── Patterns ───────────────────────────────────────────────────────────────
  patternsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  patternsSectionTitle: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 14,
  },
  patternsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  patternChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: C.surfaceHighest + "66",
    borderWidth: 1,
    borderColor: C.outlineVar + "15",
  },
  patternChipText: {
    color: C.onSurfaceVar,
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Map Section ────────────────────────────────────────────────────────────
  mapSection: {
    paddingHorizontal: 20,
  },
  mapSectionTitle: {
    color: C.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 14,
  },
  mapCard: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.outlineVar + "0D",
    aspectRatio: 2,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mapSvgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapCenterLabel: {
    alignItems: "center",
    zIndex: 10,
    gap: 6,
  },
  mapLabelTitle: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 3,
  },
  mapLabelSub: {
    color: C.outline,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 240,
  },
});
