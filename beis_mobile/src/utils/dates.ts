/** Date formatting and relative time utilities. */
import { formatDistanceToNow, format, parseISO } from "date-fns";

export function relativeTime(iso: string): string {
 try {
 return formatDistanceToNow(parseISO(iso), { addSuffix: true });
 } catch {
 return iso;
 }
}

export function formatDate(iso: string): string {
 try {
 return format(parseISO(iso), "dd MMM yyyy");
 } catch {
 return iso;
 }
}

export function formatDateTime(iso: string): string {
 try {
 return format(parseISO(iso), "dd MMM yyyy, hh:mm a");
 } catch {
 return iso;
 }
}

export function toISOString(date: Date): string {
 return date.toISOString();
}
