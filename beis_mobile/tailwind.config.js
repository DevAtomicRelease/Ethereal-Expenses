module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    primary: { DEFAULT: "#3B82F6", dark: "#2563EB" },
    danger: { DEFAULT: "#EF4444", dark: "#DC2626" },
    warning: { DEFAULT: "#F59E0B", dark: "#D97706" },
    success: { DEFAULT: "#10B981", dark: "#059669" },
    surface: { DEFAULT: "#1E293B", light: "#334155", card: "#0F172A" },
    text: { DEFAULT: "#F8FAFC", muted: "#94A3B8", dim: "#64748B" },
  }}},
  plugins: [],
};
