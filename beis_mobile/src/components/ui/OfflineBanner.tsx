import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { getPendingCount } from "@/services/offlineQueue";

export default function OfflineBanner() {
  const { isOffline } = useOfflineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (isOffline) {
      // Refresh pending count every 2 seconds while offline
      const update = () => getPendingCount().then(setPending).catch(() => {});
      update();
      const interval = setInterval(update, 2000);
      return () => clearInterval(interval);
    } else {
      setPending(0);
    }
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        Offline mode{pending > 0 ? ` · ${pending} change${pending > 1 ? "s" : ""} pending sync` : " — changes will sync when connected"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(217, 119, 6, 0.25)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },
  text: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
