import { describe, expect, it } from "vitest";
import { calculateAnnualSavings, calculateActualSavings, calculateMonthlySavings, calculateSavingsProgress } from "../../../src/domain/savings-goal";

describe("savings goal domain", () => {
  it("calculates actual savings as income minus expense", () => {
    expect(calculateActualSavings(500_000, 120_000)).toBe(380_000);
    expect(calculateActualSavings(100, 250)).toBe(-150);
  });

  it("keeps monthly and annual periods independent", () => {
    const jan = { year: 2026, month: 1, incomeVnd: 500, expenseVnd: 100 };
    const feb = { year: 2026, month: 2, incomeVnd: 800, expenseVnd: 300 };
    expect(calculateMonthlySavings(jan)).toBe(400);
    expect(calculateAnnualSavings(2026, [jan, feb])).toBe(900);
    expect(() => calculateAnnualSavings(2026, [{ ...jan, year: 2025 }])).toThrowError(/another year/);
  });

  it("clamps progress and handles zero or missing targets", () => {
    expect(calculateSavingsProgress(-10, 100)).toMatchObject({ ratio: 0, percent: 0 });
    expect(calculateSavingsProgress(150, 100)).toMatchObject({ ratio: 1, percent: 100 });
    expect(calculateSavingsProgress(10, 0)).toMatchObject({ ratio: 1, percent: 100 });
    expect(calculateSavingsProgress(10, null)).toMatchObject({ ratio: null, percent: null });
  });

  it("rejects unsafe, fractional, invalid-period and negative targets", () => {
    expect(() => calculateActualSavings(Number.MAX_SAFE_INTEGER, 0)).not.toThrow();
    expect(() => calculateActualSavings(Number.MAX_SAFE_INTEGER, -1)).toThrowError(/safe integer/);
    expect(() => calculateActualSavings(1.2, 1)).toThrowError(/safe integer/);
    expect(() => calculateMonthlySavings({ year: 2026, month: 13, incomeVnd: 1, expenseVnd: 1 })).toThrowError(/Month/);
    expect(() => calculateSavingsProgress(1, -1)).toThrowError(/negative/);
  });
});
