/** Expo Notifications setup for 10 alert types. */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
 handleNotification: async () => ({
 shouldShowAlert: true,
 shouldPlaySound: false,
 shouldSetBadge: false,
 }),
});

export async function registerForPushNotifications() {
 const { status: existing } = await Notifications.getPermissionsAsync();
 let finalStatus = existing;

 if (existing !== "granted") {
 const { status } = await Notifications.requestPermissionsAsync();
 finalStatus = status;
 }

 if (finalStatus !== "granted") return null;

 if (Platform.OS === "android") {
 await Notifications.setNotificationChannelAsync("default", {
 name: "AtomicShift Alerts",
 importance: Notifications.AndroidImportance.HIGH,
 });
 }

 const token = await Notifications.getExpoPushTokenAsync();
 return token.data;
}

export async function sendLocalNotification(title: string, body: string) {
 await Notifications.scheduleNotificationAsync({
 content: { title, body },
 trigger: null,
 });
}
