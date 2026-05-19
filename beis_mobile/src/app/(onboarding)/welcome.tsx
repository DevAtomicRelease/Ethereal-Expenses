/**
 * Welcome / Onboarding Screen — first-time user experience.
 *
 * Matches the Obsidian Orchard (dark olive-gold) theme used across the app.
 * Presented after registration; offers import, manual-add, or skip paths.
 */
import React, { useRef, useEffect } from "react";
import {
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
import { LinearGradient } from "expo-linear-gradient";
import { SvgXml } from "react-native-svg";

// ─── Design tokens (Obsidian Orchard) ─────────────────────────────────────────
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
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const atomIcon = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="28" ry="12" stroke="${C.primary}" stroke-width="2" fill="none" transform="rotate(-30 32 32)"/>
  <ellipse cx="32" cy="32" rx="28" ry="12" stroke="${C.primary}" stroke-width="2" fill="none" transform="rotate(30 32 32)"/>
  <ellipse cx="32" cy="32" rx="28" ry="12" stroke="${C.primary}" stroke-width="2" fill="none" transform="rotate(90 32 32)"/>
  <circle cx="32" cy="32" r="4" fill="${C.primary}"/>
</svg>`;

const uploadIcon = `<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill="currentColor"/></svg>`;
const editIcon = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>`;
const arrowIcon = `<svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor"/></svg>`;

export default function WelcomeScreen() {
  const router = useRouter();

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#131313", "#16190A", "#131313"]}
      start={{ x: 0.8, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={s.gradient}
    >
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            s.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Atom Icon ── */}
          <View style={s.iconContainer}>
            <View style={s.iconGlow} />
            <SvgXml xml={atomIcon} width={80} height={80} />
          </View>

          {/* ── Branding ── */}
          <Text style={s.title}>Welcome to Ethereal Expense</Text>
          <Text style={s.subtitle}>SMART EXPENSE TRACKING</Text>

          {/* ── Description ── */}
          <View style={s.descCard}>
            <Text style={s.descText}>
              Your personal spending tracker is ready.{"\n\n"}
              Import a bank statement for instant insights, or start adding transactions manually.
            </Text>
          </View>

          {/* ── Action Buttons ── */}
          <View style={s.actions}>
            {/* Primary CTA */}
            <TouchableOpacity
              style={s.primaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(onboarding)/import-wizard")}
            >
              <SvgXml
                xml={uploadIcon.replace(/currentColor/g, C.onPrimary)}
                width={20}
                height={20}
              />
              <Text style={s.primaryBtnText}>Import Bank Statement</Text>
              <SvgXml
                xml={arrowIcon.replace(/currentColor/g, C.onPrimary)}
                width={18}
                height={18}
              />
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity
              style={s.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(onboarding)/quick-add")}
            >
              <SvgXml
                xml={editIcon.replace(/currentColor/g, C.onSurfaceVar)}
                width={18}
                height={18}
              />
              <Text style={s.secondaryBtnText}>Add Manually</Text>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              style={s.skipBtn}
              activeOpacity={0.7}
              onPress={() => router.replace("/(tabs)/home")}
            >
              <Text style={s.skipText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

          {/* ── Bottom badge ── */}
          <View style={s.bottomBadge}>
            <View style={s.badgeDot} />
            <Text style={s.badgeText}>ENCRYPTED · AES-256</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // ── Icon ──
  iconContainer: {
    alignSelf: "center",
    marginBottom: 32,
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.primary + "12",
  },

  // ── Title ──
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.onSurface,
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: C.outline,
    letterSpacing: 5,
    textAlign: "center",
    marginBottom: 36,
  },

  // ── Description ──
  descCard: {
    backgroundColor: "rgba(53, 53, 52, 0.25)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(72, 71, 59, 0.15)",
    marginBottom: 36,
  },
  descText: {
    color: C.onSurfaceVar,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  // ── Buttons ──
  actions: {
    gap: 14,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
      web: {
        boxShadow: `0 8px 24px rgba(204, 201, 137, 0.25)`,
      } as any,
    }),
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.surfaceHighest + "66",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "22",
  },
  secondaryBtnText: {
    color: C.onSurfaceVar,
    fontSize: 15,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  skipText: {
    color: C.outline,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: C.outlineVar,
  },

  // ── Bottom badge ──
  bottomBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 40,
    opacity: 0.3,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  badgeText: {
    fontSize: 8,
    letterSpacing: 3,
    fontWeight: "600",
    color: C.onSurface,
  },
});
