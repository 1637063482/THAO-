/**
 * Dashboard ViewModel - pure computation layer for the spending-awareness dashboard.
 *
 * All ledger amounts, dates, fields, and budgets are interpreted by the
 * canonical read-only ledger interpreter.
 */

import { expenseCategories } from "./config.js";
import { buildLegacyStreak } from "./streak.js";
import { interpretLedger } from "../domain/ledger-interpreter.js";

/**
 * Build the dashboard ViewModel for a given month.
 *
 * @param {object} options
 * @param {number} options.year
 * @param {number} options.month
 * @param {number} [options.today] - Today's day-of-month (defaults to current date)
 * @param {Date} [options.streakDate] - Canonical ledger date used for streak computation
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
  var previousYearEntries = options.previousYearEntries;
  var ledger = interpretLedger({ year: year, entries: entries, settings: settings });
  var monthData = ledger.months[month - 1] || ledger.months[0];
  var byCategory = { ...monthData.categories };
  var totalSpending = monthData.expense;
  var totalIncome = monthData.income;
  var budgetVnd = monthData.budget;
  var days = monthData.days.map(function (dayData) {
    return {
      day: dayData.day,
      dateKey: dayData.dateKey,
      categories: { ...dayData.categories },
      totalSpending: dayData.expense,
      totalIncome: dayData.income,
    };
  }).sort(function (a, b) { return b.day - a.day; }).slice(0, 5);
  var todaySpending = monthData.days
    .filter(function (dayData) { return dayData.day === today; })
    .reduce(function (sum, dayData) { return sum + dayData.expense; }, 0);
  var hasData = monthData.recordedDays > 0;

  var budgetRemaining = budgetVnd - totalSpending;
  var isOverBudget = totalSpending > budgetVnd;

  var categoryList = expenseCategories.map(function (cat) {
    return { id: cat.id, label: cat.nameKey, emoji: cat.emoji, spending: byCategory[cat.id] || 0 };
  });
  categoryList.sort(function (a, b) { return b.spending - a.spending; });
  var topCategories = categoryList.filter(function (c) { return c.spending > 0; }).slice(0, 3);

  var streak = { streak: 0, hasRecordedToday: false };
  if (options.state && options.state.appState.entries) {
    try {
      streak = buildLegacyStreak(options.state.appState.entries, year, options.streakDate || new Date(), "Asia/Ho_Chi_Minh", { previousYearEntries: previousYearEntries });
    } catch (_e) {
      // Keep the dashboard renderable if a host clock is unavailable.
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
