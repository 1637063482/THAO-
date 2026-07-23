import { DomainError } from "./errors";

export interface SavingsGoal {
  readonly period: "month" | "year";
  readonly targetVnd: number | null;
}

export interface SavingsProgress {
  readonly actualVnd: number;
  readonly targetVnd: number | null;
  readonly ratio: number | null;
  readonly percent: number | null;
}

export interface MonthlySavings {
  readonly year: number;
  readonly month: number;
  readonly incomeVnd: number;
  readonly expenseVnd: number;
}

function safeVnd(value: number, name: string): number {
  if (!Number.isSafeInteger(value)) throw new DomainError("INVALID_SAVINGS_AMOUNT", `${name} must be a safe integer VND amount`);
  return value;
}

function validMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new DomainError("INVALID_PERIOD", "Month must be between 1 and 12");
}

function validYear(year: number): void {
  if (!Number.isSafeInteger(year) || year < 1) throw new DomainError("INVALID_PERIOD", "Year must be a positive safe integer");
}

export function calculateActualSavings(incomeVnd: number, expenseVnd: number): number {
  const income = safeVnd(incomeVnd, "Income");
  const expense = safeVnd(expenseVnd, "Expense");
  const actual = income - expense;
  if (!Number.isSafeInteger(actual)) throw new DomainError("SAVINGS_OVERFLOW", "Actual savings exceeds safe integer range");
  return actual;
}

export function calculateSavingsProgress(actualVnd: number, targetVnd: number | null): SavingsProgress {
  const actual = safeVnd(actualVnd, "Actual savings");
  if (targetVnd === null) return { actualVnd: actual, targetVnd: null, ratio: null, percent: null };
  const target = safeVnd(targetVnd, "Target");
  if (target < 0) throw new DomainError("INVALID_SAVINGS_TARGET", "Target must not be negative");
  if (target === 0) return { actualVnd: actual, targetVnd: 0, ratio: actual >= 0 ? 1 : 0, percent: actual >= 0 ? 100 : 0 };
  const ratio = Math.max(0, Math.min(1, actual / target));
  return { actualVnd: actual, targetVnd: target, ratio, percent: ratio * 100 };
}

export function calculateMonthlySavings(record: MonthlySavings): number {
  validYear(record.year);
  validMonth(record.month);
  return calculateActualSavings(record.incomeVnd, record.expenseVnd);
}

export function calculateAnnualSavings(year: number, months: readonly MonthlySavings[]): number {
  validYear(year);
  const total = months.reduce((sum, record) => {
    if (record.year !== year) throw new DomainError("PERIOD_MISMATCH", "Monthly record belongs to another year");
    return sum + calculateMonthlySavings(record);
  }, 0);
  return safeVnd(total, "Annual savings");
}
