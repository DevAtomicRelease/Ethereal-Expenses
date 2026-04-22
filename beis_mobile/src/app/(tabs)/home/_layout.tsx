import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131313" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="risk-detail" />
    </Stack>
  );
}
