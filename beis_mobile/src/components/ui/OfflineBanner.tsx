import React from "react";
import { View, Text } from "react-native";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

export default function OfflineBanner() {
 const { isOffline } = useOfflineStatus();
 if (!isOffline) return null;
 return (
 <View style={{ backgroundColor: "#D97706", paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
 <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Offline - changes will sync when connected</Text>
 </View>
 );
}
