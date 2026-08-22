import { expenseCategories } from "../../js/config.js";
import { interpretLedger, resolveLedgerBudgetVnd } from "../../domain/ledger-interpreter.js";

const GROUPED_OTHER_COLOR = "#64748B";

/**
 * @param {Record<string, unknown>} settings
 * @param {number} month
 * @returns {number}
 */
export function getAnalyticsBudgetVnd(settings = {}, month) {
  return resolveLedgerBudgetVnd(settings, month);
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
    const total = categories.reduce((sum, category) => sum + Math.max(0, category.value), 0);
    visible.push({
      id: "other-grouped",
      labelKey: "category_other_grouped",
      shortLabelKey: "category_other_grouped",
      value: remainder,
      share: total > 0 ? remainder / total : 0,
      color: GROUPED_OTHER_COLOR,
    });
  }
  return visible;
}

/**
 * Build read-only analytics from the existing legacy yearly matrix. Amounts,
 * dates, fields, and budgets come from the canonical ledger interpreter.
 *
 * @param {Object} options
 * @param {number} options.year
 * @param {number} options.activeMonth
 * @param {Record<string, unknown>} [options.entries]
 * @param {Record<string, unknown>} [options.settings]
 */
export function buildAnalyticsViewModel({ year, activeMonth, entries = {}, settings = {} }) {
  const interpreted = interpretLedger({ year, entries, settings });
  const months = interpreted.months.map((monthData) => ({
    month: monthData.month,
    income: monthData.income,
    expense: monthData.expense,
    net: monthData.net,
    budget: monthData.budget,
    budgetUsedPercent: monthData.budget > 0 ? (monthData.expense / monthData.budget) * 100 : null,
    recordedDays: monthData.recordedDays,
    expenseDays: monthData.expenseDays,
    categories: buildCategoryEntries(monthData.categories, monthData.expense),
  }));

  const dayList = interpreted.months.flatMap((monthData) => monthData.days);
  const expenseDays = dayList.filter((day) => day.expense > 0);
  const peakExpenseDay = expenseDays.reduce((peak, day) => day.expense > (peak?.expense || 0) ? day : peak, null);
  const annualIncome = interpreted.annual.income;
  const annualExpense = interpreted.annual.expense;
  const annualBudget = months.reduce((sum, month) => sum + month.budget, 0);
  const monthsWithData = months.filter((month) => month.recordedDays > 0);
  const categories = buildCategoryEntries(interpreted.annual.categories, annualExpense);
  const normalizedMonths = months.map((month) => ({ ...month, categories: month.categories }));
  const selectedMonth = normalizedMonths[Math.min(12, Math.max(1, Number(activeMonth) || 1)) - 1];

  return {
    year,
    months: normalizedMonths,
    annual: {
      income: annualIncome,
      expense: annualExpense,
      net: annualIncome - annualExpense,
      savingsRate: annualIncome > 0 ? (annualIncome - annualExpense) / annualIncome : null,
      recordedDays: interpreted.annual.recordedDays,
      expenseDays: interpreted.annual.expenseDays,
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
