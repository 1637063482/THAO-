// ==========================================
// config.js - 全局配置与常量
// ==========================================

export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const expenseCategories = [
  { id: "dining", nameKey: "category_dining", name: "餐饮饮食", emoji: "🍜", color: "#f24e3e" },
  { id: "shopping", nameKey: "category_shopping", name: "服饰购物", emoji: "👕", color: "#8b5cf6" },
  { id: "rent", nameKey: "category_rent", name: "房租房贷", emoji: "🏠", color: "#f59e0b" },
  { id: "transport", nameKey: "category_transport", name: "交通出行", emoji: "🚗", color: "#3b82f6" },
  { id: "telecom", nameKey: "category_telecom", name: "话费网费", emoji: "📱", color: "#06b6d4" },
  { id: "utilities", nameKey: "category_utilities", name: "水电燃气", emoji: "💡", color: "#f97316" },
  { id: "entertainment", nameKey: "category_entertainment", name: "休闲娱乐", emoji: "🎬", color: "#a855f7" },
  { id: "health", nameKey: "category_health", name: "医疗健康", emoji: "💊", color: "#10b981" },
  { id: "social", nameKey: "category_social", name: "人情社交", emoji: "🎉", color: "#ec4899" },
  { id: "other", nameKey: "category_other", name: "其他支出", emoji: "📦", color: "#6b7280" },
];

export const DEFAULT_FX_RATE = 3700;
export const DEFAULT_BUDGET_VND = 15000000;
