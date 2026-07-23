import { describe, expect, it } from "vitest";
import { getSavingsGoalKey, readSavingsGoals, writeAnnualSavingsGoal, writeMonthlySavingsGoal } from "../../src/js/savings-goal-store.js";

describe("savings goal store", () => {
  it("reads twelve monthly goals and annual goal from one settings object", () => {
    expect(readSavingsGoals({ savings_goal_month_1: 100000, savings_goal_month_12: 200000, savings_goal_annual: 300000 })).toEqual({
      monthly: [100000, ...Array(10).fill(null), 200000], annual: 300000,
    });
  });

  it("round-trips writes through settings and pending updates", () => {
    const settings = {};
    const pending = {};
    writeMonthlySavingsGoal(settings, pending, 3, 500000);
    writeAnnualSavingsGoal(settings, pending, 6000000);
    expect(readSavingsGoals(settings).monthly[2]).toBe(500000);
    expect(readSavingsGoals(settings).annual).toBe(6000000);
    expect(pending).toEqual({ savings_goal_month_3: 500000, savings_goal_annual: 6000000 });
  });

  it("clears goals with explicit null and leaves old settings compatible", () => {
    const settings = { savings_goal_month_1: 100, savings_goal_annual: 200 };
    const pending = {};
    writeMonthlySavingsGoal(settings, pending, 1, null);
    writeAnnualSavingsGoal(settings, pending, null);
    expect(readSavingsGoals(settings)).toEqual({ monthly: Array(12).fill(null), annual: null });
    expect(getSavingsGoalKey(12)).toBe("savings_goal_month_12");
  });

  it.each([0, 13])("rejects invalid month %s", (month) => {
    expect(() => writeMonthlySavingsGoal({}, {}, month, 1)).toThrowError(/Month/);
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, "100"]) ("rejects invalid goal %s", (value) => {
    expect(() => writeAnnualSavingsGoal({}, {}, value)).toThrowError(/safe integer/);
  });
});
