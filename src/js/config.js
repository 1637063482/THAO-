// ==========================================
// config.js - 全局配置与常量
// ==========================================

export const REAL_CURRENT_YEAR = new Date().getFullYear();
export const TODAY = new Date();
export const CURRENT_MONTH = TODAY.getMonth() + 1;
export const CURRENT_DAY = TODAY.getDate();

export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const expenseCategories = [
  { id: "dining", name: "餐饮饮食", emoji: "🍜", color: "#f24e3e" },
  { id: "shopping", name: "服饰购物", emoji: "👕", color: "#8b5cf6" },
  { id: "rent", name: "房租房贷", emoji: "🏠", color: "#f59e0b" },
  { id: "transport", name: "交通出行", emoji: "🚗", color: "#3b82f6" },
  { id: "telecom", name: "话费网费", emoji: "📱", color: "#06b6d4" },
  { id: "utilities", name: "水电燃气", emoji: "💡", color: "#f97316" },
  { id: "entertainment", name: "休闲娱乐", emoji: "🎬", color: "#a855f7" },
  { id: "health", name: "医疗健康", emoji: "💊", color: "#10b981" },
  { id: "social", name: "人情社交", emoji: "🎉", color: "#ec4899" },
  { id: "other", name: "其他支出", emoji: "📦", color: "#6b7280" },
];

export const DEFAULT_FX_RATE = 3500;
export const DEFAULT_BUDGET_VND = 15000000;