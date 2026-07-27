const ANNUAL_KEY = "savings_goal_annual";
function validValue(value) { return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0); }
function assertValue(value) { if (!validValue(value)) throw new Error("Savings goal must be a non-negative safe integer VND amount or null"); }
function assertMonth(month) { if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("Month must be between 1 and 12"); }
export function readSavingsGoals(settings = {}) { const monthly = Array.from({ length: 12 }, (_, index) => { const value = settings["savings_goal_month_" + (index + 1)]; return validValue(value) ? value : null; }); return { monthly, annual: validValue(settings[ANNUAL_KEY]) ? settings[ANNUAL_KEY] : null }; }
export function writeMonthlySavingsGoal(settings, pendingUpdates, month, value) { assertMonth(month); assertValue(value); const key = "savings_goal_month_" + month; settings[key] = value; pendingUpdates[key] = value; return value; }
export function writeAnnualSavingsGoal(settings, pendingUpdates, value) { assertValue(value); settings[ANNUAL_KEY] = value; pendingUpdates[ANNUAL_KEY] = value; return value; }
export function getSavingsGoalKey(month) { assertMonth(month); return "savings_goal_month_" + month; }
export const SAVINGS_GOAL_ANNUAL_KEY = ANNUAL_KEY;
export const SAVINGS_GOAL_MONTH_KEY = /^savings_goal_month_([1-9]|1[0-2])$/;
