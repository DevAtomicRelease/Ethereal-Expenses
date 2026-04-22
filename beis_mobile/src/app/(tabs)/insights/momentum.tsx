/**
 * Momentum detail screen (within Insights tab).
 * Shows momentum direction + acceleration from GET /momentum.
 * Back-nav returns to AI Hub.
 */
import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { useMomentum } from "@/api/queries/useMomentum";

const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  secondary: "#C0CAAF",
};

const backArrow = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

export default function MomentumScreen() {
  const router = useRouter();
  const { data, isLoading } = useMomentum();

  const direction = data?.direction ?? "stable";
  const acceleration = data?.acceleration ?? 0;
  const isUp = direction === "accelerating" || direction === "accelerating_fast";
  const isDown = direction === "decelerating" || direction === "decelerating_fast";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.title}>Momentum</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Direction Card */}
            <View style={s.dirCard}>
              <Text style={s.dirLabel}>SPENDING DIRECTION</Text>
              <Text style={[
                s.dirValue,
                isUp && { color: C.error },
                isDown && { color: C.secondary },
              ]}>
                {direction.charAt(0).toUpperCase() + direction.slice(1)}
              </Text>
              <Text style={s.dirArrow}>
                {isUp ? "↗" : isDown ? "↘" : "→"}
              </Text>
            </View>

            {/* Acceleration Card */}
            <View style={s.accelCard}>
              <Text style={s.accelLabel}>ACCELERATION</Text>
              <View style={s.accelRow}>
                <Text style={s.accelValue}>
                  {acceleration >= 0 ? "+" : ""}{acceleration.toFixed(1)}%
                </Text>
                <Text style={s.accelSub}>
                  {acceleration > 0
                    ? "Spending is accelerating"
                    : acceleration < 0
                      ? "Spending is decelerating"
                      : "Spending rate is stable"}
                </Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>What is Momentum?</Text>
              <Text style={s.infoText}>
                Momentum tracks the speed and direction of your spending changes over time. 
                A positive acceleration means you're spending more each period, while negative 
                means you're slowing down.
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  backBtn: { padding: 4 },
  title: { color: C.onSurface, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20 },

  dirCard: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
    alignItems: "center",
  },
  dirLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  dirValue: {
    color: C.onSurface,
    fontSize: 28,
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: 8,
  },
  dirArrow: {
    fontSize: 36,
    color: C.primary,
  },

  accelCard: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  accelLabel: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  accelRow: { gap: 6 },
  accelValue: {
    color: C.onSurface,
    fontSize: 32,
    fontWeight: "800",
  },
  accelSub: {
    color: C.onSurfaceVar,
    fontSize: 14,
  },

  infoCard: {
    backgroundColor: C.primary + "0D",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.primary + "1A",
  },
  infoTitle: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoText: {
    color: C.onSurfaceVar,
    fontSize: 13,
    lineHeight: 20,
  },
});
