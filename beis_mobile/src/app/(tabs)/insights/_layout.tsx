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
      <Stack.Screen
        name="chat"
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="heatmap"
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="streaks"
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="recurring"
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
      <Stack.Screen
        name="splits"
        options={{ animation: "slide_from_right", gestureEnabled: true }}
      />
    </Stack>
  );
}
