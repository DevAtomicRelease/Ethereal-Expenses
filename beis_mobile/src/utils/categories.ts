/** Category enum, display names, colors, and icons. */


export const CATEGORIES= {
 food: { label: "Food", color: "#F59E0B", icon: "utensils" },
 transport: { label: "Transport", color: "#3B82F6", icon: "car" },
 entertainment: { label: "Entertainment", color: "#8B5CF6", icon: "film" },
 shopping: { label: "Shopping", color: "#EC4899", icon: "shopping-bag" },
 groceries: { label: "Groceries", color: "#10B981", icon: "shopping-cart" },
 health: { label: "Health", color: "#EF4444", icon: "heart-pulse" },
 education: { label: "Education", color: "#06B6D4", icon: "book-open" },
 utilities: { label: "Utilities", color: "#6366F1", icon: "zap" },
 rent: { label: "Rent", color: "#F97316", icon: "home" },
 subscriptions: { label: "Subscriptions", color: "#A855F7", icon: "repeat" },
 travel: { label: "Travel", color: "#14B8A6", icon: "plane" },
 alcohol: { label: "Alcohol", color: "#DC2626", icon: "wine" },
 dining_out: { label: "Dining Out", color: "#D97706", icon: "chef-hat" },
 coffee: { label: "Coffee", color: "#92400E", icon: "coffee" },
 personal_care: { label: "Personal Care", color: "#DB2777", icon: "sparkles" },
 electronics: { label: "Electronics", color: "#2563EB", icon: "smartphone" },
 clothing: { label: "Clothing", color: "#7C3AED", icon: "shirt" },
 gifts: { label: "Gifts", color: "#E11D48", icon: "gift" },
 charity: { label: "Charity", color: "#059669", icon: "heart" },
 fitness: { label: "Fitness", color: "#16A34A", icon: "dumbbell" },
 fuel: { label: "Fuel", color: "#EA580C", icon: "fuel" },
 insurance: { label: "Insurance", color: "#4F46E5", icon: "shield" },
 emi: { label: "EMI", color: "#9333EA", icon: "credit-card" },
 recharge: { label: "Recharge", color: "#0D9488", icon: "smartphone" },
 misc: { label: "Miscellaneous", color: "#64748B", icon: "more-horizontal" },
};

export const CATEGORY_LIST= Object.keys(CATEGORIES);

export function getCategoryColor(cat) {
 return (CATEGORIES)[cat]?.color || "#64748B";
}

export function getCategoryLabel(cat) {
 return (CATEGORIES)[cat]?.label || cat;
}
