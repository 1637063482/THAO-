const ANNUAL_KEY = "savings_goal_annual";
/** @typedef {import("../../types/app-state").LedgerSettings} LedgerSettings */
/** @typedef {number | null} SavingsGoalValue */

/** @param {unknown} value @returns {value is SavingsGoalValue} */
function validValue(value) { return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0); }
/** @param {unknown} value */
function assertValue(value) { if (!validValue(value)) throw new Error("Savings goal must be a non-negative safe integer VND amount or null"); }
/** @param {number} month */
function assertMonth(month) { if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Month must be between 1 and 12"); }
/** @param {LedgerSettings} [settings] */
export function readSavingsGoals(settings = {}) { const monthly = Array.from({ length: 12 }, (_, index) => { const value = settings["savings_goal_month_" + (index + 1)]; return validValue(value) ? value : null; }); return { monthly, annual: validValue(settings[ANNUAL_KEY]) ? settings[ANNUAL_KEY] : null }; }
/** @param {LedgerSettings} settings @param {LedgerSettings} pendingUpdates @param {number} month @param {SavingsGoalValue} value @param {(key: string, value: SavingsGoalValue) => void} [stagePendingSetting] */
export function writeMonthlySavingsGoal(settings, pendingUpdates, month, value, stagePendingSetting) { assertMonth(month); assertValue(value); const key = "savings_goal_month_" + month; settings[key] = value; if (stagePendingSetting) stagePendingSetting(key, value); else pendingUpdates[key] = value; return value; }
/** @param {LedgerSettings} settings @param {LedgerSettings} pendingUpdates @param {SavingsGoalValue} value @param {(key: string, value: SavingsGoalValue) => void} [stagePendingSetting] */
export function writeAnnualSavingsGoal(settings, pendingUpdates, value, stagePendingSetting) { assertValue(value); settings[ANNUAL_KEY] = value; if (stagePendingSetting) stagePendingSetting(ANNUAL_KEY, value); else pendingUpdates[ANNUAL_KEY] = value; return value; }
/** @param {number} month */
export function getSavingsGoalKey(month) { assertMonth(month); return "savings_goal_month_" + month; }
export const SAVINGS_GOAL_ANNUAL_KEY = ANNUAL_KEY;
export const SAVINGS_GOAL_MONTH_KEY = /^savings_goal_month_([1-9]|1[0-2])$/;
