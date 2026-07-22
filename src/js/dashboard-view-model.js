/**
 * Dashboard ViewModel — pure computation layer for the spending-awareness dashboard.
 *
 * Reads existing balances/entries/settings and validated derivative functions.
 * Does NOT duplicate amount/date/streak business rules.
 */

import { expenseCategories, DEFAULT_BUDGET_VND } from "./config.js";
import { safeEval } from "./utils.js";
import { buildLegacyStreak } from "./streak.js";

/**
 * Get the raw budget VND for a given month from settings.
 * @param {object} settings - state.appState.settings
 * @param {number} month
 * @returns {number}
 */
function getBudgetVnd(settings, month) {
  if (!settings) return DEFAULT_BUDGET_VND;
  var key = "budget_" + month;
  if (settings[key] !== undefined) return parseFloat(settings[key]);
  if (settings.monthlyBudget !== undefined) return parseFloat(settings.monthlyBudget);
  return DEFAULT_BUDGET_VND;
}

/**
 * Evaluate an entry formula string to a numeric value.
 * @param {string} formula
 * @returns {number}
 */
function evalEntry(formula) {
  if (!formula || typeof formula !== "string") return 0;
  return safeEval(formula) || 0;
}

/**
 * Build the dashboard ViewModel for a given month.
 *
 * @param {object} options
 * @param {number} options.year
 * @param {number} options.month
 * @param {number} [options.today] - Today's day-of-month (defaults to current date)
 * @param {object} [options.state] - The application state module reference (for entries/settings)
 * @returns {object} dashboard ViewModel
 */
export function buildDashboardViewModel(options) {
  var year = options.year;
  var month = options.month;
  var today = options.today != null ? options.today : new Date().getDate();
  var appState = options.state ? options.state.appState : { entries: {}, settings: {} };
  var entries = appState.entries || {};
  var settings = appState.settings || {};

  // Filter entries for the given month
  var prefix = month + "_";
  var monthEntries = {};
  var hasData = false;
  Object.keys(entries).forEach(function (key) {
    if (key.startsWith(prefix)) {
      monthEntries[key] = entries[key];
      if (entries[key]) hasData = true;
    }
  });

  // Compute category totals
  var byCategory = {};
  var totalSpending = 0;
  var totalIncome = 0;
  var todaySpending = 0;

  expenseCategories.forEach(function (cat) {
    byCategory[cat.id] = 0;
  });

  Object.keys(monthEntries).forEach(function (key) {
    var parts = key.split("_");
    var day = parseInt(parts[1], 10);
    var fieldId = parts.slice(2).join("_");
    var val = evalEntry(monthEntries[key]);

    if (fieldId === "income") {
      totalIncome += val;
      if (day === today) todaySpending += val;
    } else if (fieldId === "remark") {
      // Skip remarks
    } else {
      // It's a category
      totalSpending += val;
      if (day === today) todaySpending += val;
      if (byCategory[fieldId] !== undefined) {
        byCategory[fieldId] += val;
      }
    }
  });

  // Budget remaining
  var budgetVnd = getBudgetVnd(settings, month);
  var budgetRemaining = Math.max(0, budgetVnd - totalSpending);
  var isOverBudget = totalSpending > budgetVnd;

  // Top categories by spending
  var categoryList = expenseCategories.map(function (cat) {
    return { id: cat.id, label: cat.nameKey, emoji: cat.emoji, spending: byCategory[cat.id] || 0 };
  });
  categoryList.sort(function (a, b) { return b.spending - a.spending; });
  var topCategories = categoryList.filter(function (c) { return c.spending > 0; }).slice(0, 3);

  // Daily breakdown: aggregate entries by day
  var dayMap = {};
  Object.keys(monthEntries).forEach(function (key) {
    var parts = key.split("_");
    var day = parseInt(parts[1], 10);
    var fieldId = parts.slice(2).join("_");
    var val = evalEntry(monthEntries[key]);

    if (fieldId === "remark") return;
    if (!dayMap[day]) {
      dayMap[day] = { day: day, dateKey: year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"), categories: {}, totalSpending: 0, totalIncome: 0 };
    }
    if (fieldId === "income") {
      dayMap[day].totalIncome += val;
    } else {
      dayMap[day].totalSpending += val;
      dayMap[day].categories[fieldId] = (dayMap[day].categories[fieldId] || 0) + val;
    }
  });

  // Sort days descending and take the most recent 5
  var days = Object.keys(dayMap).map(function (d) { return dayMap[d]; });
  days.sort(function (a, b) { return b.day - a.day; });
  days = days.slice(0, 5);

  // Streak data
  var streak = { streak: 0, hasRecordedToday: false };
  if (options.state && options.state.appState.entries) {
    try {
      streak = buildLegacyStreak(options.state.appState.entries, year, today, "Asia/Ho_Chi_Minh");
    } catch (_e) {
      // Fallback: streak computation may fail in test env
    }
  }

  return {
    budgetRemaining: budgetRemaining,
    isOverBudget: isOverBudget,
    budgetVnd: budgetVnd,
    totalSpending: totalSpending,
    totalIncome: totalIncome,
    todaySpending: todaySpending,
    byCategory: byCategory,
    topCategories: topCategories,
    days: days,
    streak: streak,
    noData: !hasData,
  };
}
