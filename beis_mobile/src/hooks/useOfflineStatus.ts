import { useState, useEffect } from "react";
import { isOnline, onNetworkChange } from "@/services/networkMonitor";

export function useOfflineStatus() {
 const [online, setOnline] = useState(isOnline());
 useEffect(() => {
 return onNetworkChange(setOnline);
 }, []);
 return { isOnline: online, isOffline: !online };
}

