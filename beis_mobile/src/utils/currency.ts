/** INR currency formatting. */

export function formatINR(amount: number): string {
 if (amount >= 100000) {
 return "₹" + (amount / 100000).toFixed(1) + "L";
 }
 if (amount >= 1000) {
 return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
 }
 return "₹" + amount.toFixed(0);
}

export function formatINRFull(amount: number): string {
 return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
