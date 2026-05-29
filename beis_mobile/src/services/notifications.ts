/** Expo Notifications — local alerts for behavioral intervention. */
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
  name: "Ethereal Expense Alerts",
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

// ─── Typed behavioral alert functions ─────────────────────────────────────────

/** Alert when risk score crosses the danger threshold. */
export async function notifyHighRisk(riskScore: number, riskLevel: string) {
 const emoji = riskLevel === "danger" ? "🚨" : "⚠️";
 await sendLocalNotification(
  `${emoji} High Spending Risk`,
  `Your risk score is ${riskScore}/100 (${riskLevel}). Review your recent spending patterns.`
 );
}

/** Alert when anomalies are detected in the intelligence pipeline. */
export async function notifyAnomalyDetected(anomalyCount: number) {
 await sendLocalNotification(
  "🔍 Unusual Spending Detected",
  `${anomalyCount} spending anomal${anomalyCount === 1 ? "y" : "ies"} flagged. Tap to review.`
 );
}

/** Alert when month-end projection exceeds the monthly budget. */
export async function notifyOverBudgetForecast(projectedAmount: number, monthlyBudget: number) {
 const overBy = Math.round(projectedAmount - monthlyBudget);
 await sendLocalNotification(
  "📈 Over-Budget Forecast",
  `At your current pace, you'll overspend by ₹${overBy.toLocaleString("en-IN")} this month.`
 );
}

/** Alert when daily budget threshold is breached. */
export async function notifyDailyBudgetBreach(spent: number, limit: number) {
 const pct = Math.round((spent / limit) * 100);
 await sendLocalNotification(
  "💸 Daily Budget Exceeded",
  `You've spent ₹${Math.round(spent).toLocaleString("en-IN")} today — ${pct}% of your ₹${Math.round(limit).toLocaleString("en-IN")} daily limit.`
 );
}

/** Schedule a delayed notification (for impulse cooling-off). */
export async function scheduleDelayedNotification(
 title: string,
 body: string,
 delaySecs: number
) {
 await Notifications.scheduleNotificationAsync({
  content: { title, body },
  trigger: { seconds: delaySecs, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
 });
}
