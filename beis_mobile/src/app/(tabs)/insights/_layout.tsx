import { Stack } from "expo-router";

export default function InsightsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131313" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="identity" />
      <Stack.Screen name="anomalies" />
      <Stack.Screen name="behavior" />
      <Stack.Screen name="momentum" />
      <Stack.Screen name="thresholds" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="risk-breakdown" />
    </Stack>
  );
}
