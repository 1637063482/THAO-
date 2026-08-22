import { DEFAULT_BUDGET_VND, expenseCategories } from "../js/config.js";
import { parseVndAmount } from "../js/ledger-validation.js";

const ENTRY_KEY_RE = /^(\d{1,2})_(\d{1,2})_(.+)$/;
const CATEGORY_IDS = new Set(expenseCategories.map((category) => category.id));

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function emptyCategories() {
  return Object.fromEntries(expenseCategories.map((category) => [category.id, 0]));
}

function parseEntryAmount(rawValue) {
  const parsed = parseVndAmount(rawValue);
  return parsed.ok && parsed.value !== null ? parsed.value : null;
}

function resolveBudgetValue(rawValue) {
  const parsed = parseVndAmount(rawValue);
  return parsed.ok && parsed.value !== null ? parsed.value : null;
}

/**
 * Resolve the effective VND budget using one rule for every read-only view.
 * A valid month override wins; an invalid override falls back to the valid
 * legacy baseline, then to the product default.
 *
 * @param {Record<string, unknown>} settings
 * @param {number} month
 * @returns {number}
 */
export function resolveLedgerBudgetVnd(settings = {}, month) {
  const monthValue = resolveBudgetValue(settings[`budget_${month}`]);
  if (settings[`budget_${month}`] !== undefined && monthValue !== null) return monthValue;
  const baseline = resolveBudgetValue(settings.monthlyBudget);
  return baseline ?? DEFAULT_BUDGET_VND;
}

/**
 * Interpret the legacy yearly matrix without mutating it. Invalid financial
 * values and unknown fields are excluded; valid zero values are recorded but
 * do not create an active accounting day for streak purposes.
 *
 * @param {{year: number, entries?: Record<string, unknown>, settings?: Record<string, unknown>}} input
 */
export function interpretLedger({ year, entries = {}, settings = {} }) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    daysInMonth: daysInMonth(year, index + 1),
    income: 0,
    expense: 0,
    net: 0,
    budget: resolveLedgerBudgetVnd(settings, index + 1),
    categories: emptyCategories(),
    days: [],
  }));
  const dayMap = new Map();
  const activityDates = new Set();

  Object.entries(entries || {}).forEach(([key, rawValue]) => {
    const match = ENTRY_KEY_RE.exec(key);
    if (!match) return;
    const month = Number(match[1]);
    const day = Number(match[2]);
    const field = match[3];
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return;
    if (field !== "remark" && field !== "income" && !CATEGORY_IDS.has(field)) return;

    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayKey = `${month}_${day}`;
    const dayData = dayMap.get(dayKey) || {
      month,
      day,
      dateKey,
      income: 0,
      expense: 0,
      categories: emptyCategories(),
      recorded: false,
    };

    if (field === "remark") {
      if (String(rawValue ?? "").trim()) dayData.recorded = true;
      if (dayData.recorded) dayMap.set(dayKey, dayData);
      return;
    }

    const value = parseEntryAmount(rawValue);
    if (value === null) return;
    dayData.recorded = true;
    if (field === "income") {
      dayData.income += value;
    } else {
      dayData.expense += value;
      dayData.categories[field] += value;
    }
    if (value > 0) activityDates.add(dateKey);
    dayMap.set(dayKey, dayData);
  });

  months.forEach((monthData) => {
    monthData.days = Array.from(dayMap.values())
      .filter((day) => day.month === monthData.month)
      .sort((left, right) => left.day - right.day);
    monthData.income = monthData.days.reduce((sum, day) => sum + day.income, 0);
    monthData.expense = monthData.days.reduce((sum, day) => sum + day.expense, 0);
    monthData.net = monthData.income - monthData.expense;
    monthData.categories = monthData.days.reduce((totals, day) => {
      expenseCategories.forEach((category) => {
        totals[category.id] += day.categories[category.id] || 0;
      });
      return totals;
    }, emptyCategories());
    monthData.recordedDays = monthData.days.filter((day) => day.recorded).length;
    monthData.expenseDays = monthData.days.filter((day) => day.expense > 0).length;
  });

  const annualIncome = months.reduce((sum, month) => sum + month.income, 0);
  const annualExpense = months.reduce((sum, month) => sum + month.expense, 0);
  const annualCategories = months.reduce((totals, month) => {
    expenseCategories.forEach((category) => {
      totals[category.id] += month.categories[category.id] || 0;
    });
    return totals;
  }, emptyCategories());

  return {
    year,
    months,
    annual: {
      income: annualIncome,
      expense: annualExpense,
      net: annualIncome - annualExpense,
      categories: annualCategories,
      recordedDays: months.reduce((sum, month) => sum + month.recordedDays, 0),
      expenseDays: months.reduce((sum, month) => sum + month.expenseDays, 0),
    },
    activityDates: Array.from(activityDates).sort(),
  };
}
