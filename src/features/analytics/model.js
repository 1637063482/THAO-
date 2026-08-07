import { DEFAULT_BUDGET_VND, expenseCategories, getDaysInMonth } from "../../js/config.js";
import { safeEval } from "../../js/utils.js";

const GROUPED_OTHER_COLOR = "#64748B";

/**
 * @param {Record<string, string | number | undefined>} settings
 * @param {number} month
 * @returns {number}
 */
export function getAnalyticsBudgetVnd(settings = {}, month) {
  const value = settings["budget_" + month] ?? settings.monthlyBudget;
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BUDGET_VND;
}

/**
 * @param {Record<string, number>} totals
 * @param {number} totalExpense
 * @returns {Array<{id: string, labelKey: string, shortLabelKey: string, value: number, share: number, color: string}>}
 */
function buildCategoryEntries(totals, totalExpense) {
  return expenseCategories
    .map((category) => ({
      id: category.id,
      labelKey: category.nameKey,
      shortLabelKey: category.nameKey + "_short",
      value: totals[category.id] || 0,
      share: totalExpense > 0 ? (totals[category.id] || 0) / totalExpense : 0,
      color: category.color,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Reduce a full category list to the chart-friendly top five plus one grouped row.
 * @param {ReturnType<typeof buildCategoryEntries>} categories
 * @param {number} [limit]
 */
export function toChartCategories(categories, limit = 5) {
  const visible = categories.filter((category) => category.value > 0).slice(0, limit);
  const remainder = categories.slice(limit).reduce((sum, category) => sum + Math.max(0, category.value), 0);
  if (remainder > 0) {
    visible.push({
      id: "other-grouped",
      labelKey: "category_other_grouped",
      shortLabelKey: "category_other_grouped",
      value: remainder,
      share: categories.reduce((sum, category) => sum + Math.max(0, category.value), 0) > 0
        ? remainder / categories.reduce((sum, category) => sum + Math.max(0, category.value), 0)
        : 0,
      color: GROUPED_OTHER_COLOR,
    });
  }
  return visible;
}

/**
 * @typedef {Object} AnalyticsDay
 * @property {number} month
 * @property {number} day
 * @property {string} dateKey
 * @property {number} income
 * @property {number} expense
 * @property {boolean} recorded
 */

/**
 * Build read-only analytics from the existing legacy yearly matrix.
 * No values returned by this function are intended for persistence.
 *
 * @param {Object} options
 * @param {number} options.year
 * @param {number} options.activeMonth
 * @param {Record<string, unknown>} [options.entries]
 * @param {Record<string, string | number | undefined>} [options.settings]
 */
export function buildAnalyticsViewModel({ year, activeMonth, entries = {}, settings = {} }) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    income: 0,
    expense: 0,
    net: 0,
    budget: getAnalyticsBudgetVnd(settings, index + 1),
    budgetUsedPercent: 0,
    recordedDays: 0,
    expenseDays: 0,
    categories: Object.fromEntries(expenseCategories.map((category) => [category.id, 0])),
  }));
  /** @type {Map<string, AnalyticsDay>} */
  const days = new Map();

  Object.entries(entries).forEach(([key, rawValue]) => {
    const match = /^(\d{1,2})_(\d{1,2})_(.+)$/.exec(key);
    if (!match) return;
    const month = Number(match[1]);
    const day = Number(match[2]);
    const field = match[3];
    if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) return;
    const monthData = months[month - 1];
    const dateKey = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    const dayKey = month + "_" + day;
    const dayData = days.get(dayKey) || { month, day, dateKey, income: 0, expense: 0, recorded: false };

    if (field === "remark") {
      if (String(rawValue ?? "").trim()) dayData.recorded = true;
      if (dayData.recorded) days.set(dayKey, dayData);
      return;
    }

    const value = safeEval(rawValue);

    if (field === "income") {
      monthData.income += value;
      dayData.income += value;
      dayData.recorded = true;
    } else if (Object.prototype.hasOwnProperty.call(monthData.categories, field)) {
      monthData.categories[field] += value;
      monthData.expense += value;
      dayData.expense += value;
      dayData.recorded = true;
    } else {
      return;
    }
    days.set(dayKey, dayData);
  });

  months.forEach((monthData) => {
    monthData.net = monthData.income - monthData.expense;
    monthData.budgetUsedPercent = monthData.budget > 0
      ? (monthData.expense / monthData.budget) * 100
      : null;
    const monthDays = Array.from(days.values()).filter((day) => day.month === monthData.month);
    monthData.recordedDays = monthDays.filter((day) => day.recorded).length;
    monthData.expenseDays = monthDays.filter((day) => day.expense > 0).length;
    monthData.categories = buildCategoryEntries(monthData.categories, monthData.expense);
  });

  const annualIncome = months.reduce((sum, month) => sum + month.income, 0);
  const annualExpense = months.reduce((sum, month) => sum + month.expense, 0);
  const annualCategories = expenseCategories.reduce((totals, category) => {
    totals[category.id] = months.reduce((sum, month) => {
      const item = month.categories.find((entry) => entry.id === category.id);
      return sum + (item?.value || 0);
    }, 0);
    return totals;
  }, {});
  const dayList = Array.from(days.values());
  const expenseDays = dayList.filter((day) => day.expense > 0);
  const peakExpenseDay = expenseDays.reduce((peak, day) => day.expense > (peak?.expense || 0) ? day : peak, null);
  const annualBudget = months.reduce((sum, month) => sum + month.budget, 0);
  const monthsWithData = months.filter((month) => month.recordedDays > 0);
  const categories = buildCategoryEntries(annualCategories, annualExpense);

  const normalizedMonths = months.map((month) => ({
    ...month,
    categories: month.categories,
  }));
  const selectedMonth = normalizedMonths[Math.min(12, Math.max(1, Number(activeMonth) || 1)) - 1];

  return {
    year,
    activeMonth: selectedMonth.month,
    months: normalizedMonths,
    annual: {
      income: annualIncome,
      expense: annualExpense,
      net: annualIncome - annualExpense,
      savingsRate: annualIncome > 0 ? (annualIncome - annualExpense) / annualIncome : null,
      recordedDays: dayList.filter((day) => day.recorded).length,
      expenseDays: expenseDays.length,
      averageExpensePerExpenseDay: expenseDays.length > 0 ? annualExpense / expenseDays.length : 0,
      peakExpenseDay: peakExpenseDay ? {
        month: peakExpenseDay.month,
        day: peakExpenseDay.day,
        dateKey: peakExpenseDay.dateKey,
        amount: peakExpenseDay.expense,
      } : null,
      categories,
      topCategories: toChartCategories(categories),
      budget: {
        total: annualBudget,
        usedPercent: annualBudget > 0 ? (annualExpense / annualBudget) * 100 : null,
        monthsWithData: monthsWithData.length,
        monthsWithinBudget: monthsWithData.filter((month) => month.expense <= month.budget).length,
      },
    },
    activeMonth: {
      ...selectedMonth,
      topCategories: toChartCategories(selectedMonth.categories),
    },
  };
}
