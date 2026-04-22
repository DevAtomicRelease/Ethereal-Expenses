/**
 * Anomalies detail screen (within Insights tab).
 * Displays anomaly data from GET /anomalies so back-nav returns to AI Hub.
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
import { useAnomalies } from "@/api/queries/useAnomalies";

const C = {
  bg: "#131313",
  surface: "#1C1B1B",
  surfaceHighest: "#353534",
  primary: "#CCC989",
  onSurface: "#E5E2E1",
  onSurfaceVar: "#CAC7B7",
  outlineVar: "#48473B",
  error: "#FFB4AB",
  errorContainer: "#93000A",
};

const backArrow = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>`;

export default function AnomaliesScreen() {
  const router = useRouter();
  const { data, isLoading } = useAnomalies();
  const anomalies = data?.anomalies ?? [];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <SvgXml xml={backArrow.replace(/currentColor/g, C.onSurface)} width={22} height={22} />
        </TouchableOpacity>
        <Text style={s.title}>Anomalies</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : anomalies.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>✓</Text>
            <Text style={s.emptyTitle}>All Clear</Text>
            <Text style={s.emptySub}>No anomalies detected in your recent transactions.</Text>
          </View>
        ) : (
          anomalies.map((a, i) => (
            <View key={i} style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.severityDot, a.severity === "high" && s.severityHigh]} />
                <Text style={s.severityText}>
                  {(a.severity ?? "medium").toUpperCase()}
                </Text>
              </View>
              <Text style={s.anomalyType}>
                {(a.anomaly_type ?? "Unknown").replace(/_/g, " ")}
              </Text>
              {a.details?.amount != null && (
                <Text style={s.amount}>₹{a.details.amount.toLocaleString()}</Text>
              )}
              {a.transaction_id && (
                <Text style={s.timestamp}>
                  Transaction: {a.transaction_id.slice(0, 8)}…
                </Text>
              )}
            </View>
          ))
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
  card: {
    backgroundColor: C.surfaceHighest + "33",
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.outlineVar + "1A",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  severityDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary,
  },
  severityHigh: { backgroundColor: C.error },
  severityText: {
    color: C.onSurfaceVar,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  anomalyType: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  amount: { color: C.error, fontSize: 18, fontWeight: "800", marginTop: 4 },
  timestamp: { color: C.onSurfaceVar + "99", fontSize: 12, marginTop: 4 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: { fontSize: 40, color: C.primary, marginBottom: 12 },
  emptyTitle: { color: C.onSurface, fontSize: 20, fontWeight: "800", marginBottom: 6 },
  emptySub: { color: C.onSurfaceVar, fontSize: 14, textAlign: "center" },
});
