import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131313" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user-profile" />
      <Stack.Screen name="manage-profile" />
      <Stack.Screen name="batch-import" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="thresholds" />
      <Stack.Screen name="data-export" />
      <Stack.Screen name="impulse-log" />
    </Stack>
  );
}

