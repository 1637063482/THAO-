// ==========================================
// config.js - 全局配置与常量
// ==========================================

export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const expenseCategories = [
  { id: "dining", nameKey: "category_dining", emoji: "🍜", color: "#f24e3e" },
  { id: "shopping", nameKey: "category_shopping", emoji: "👕", color: "#8b5cf6" },
  { id: "rent", nameKey: "category_rent", emoji: "🏠", color: "#f59e0b" },
  { id: "transport", nameKey: "category_transport", emoji: "🚗", color: "#3b82f6" },
  { id: "telecom", nameKey: "category_telecom", emoji: "📱", color: "#06b6d4" },
  { id: "utilities", nameKey: "category_utilities", emoji: "💡", color: "#f97316" },
  { id: "entertainment", nameKey: "category_entertainment", emoji: "🎬", color: "#a855f7" },
  { id: "health", nameKey: "category_health", emoji: "💊", color: "#10b981" },
  { id: "social", nameKey: "category_social", emoji: "🎉", color: "#ec4899" },
  { id: "other", nameKey: "category_other", emoji: "📦", color: "#6b7280" },
];

export const DEFAULT_FX_RATE = 3500;
export const DEFAULT_BUDGET_VND = 15000000;
