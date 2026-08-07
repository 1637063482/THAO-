import { describe, expect, it } from "vitest";

import { buildAnalyticsViewModel } from "../../src/features/analytics/model.js";

describe("analytics view model", () => {
  it("aggregates income, expenses, net cash flow, days, and category shares", () => {
    const model = buildAnalyticsViewModel({
      year: 2026,
      activeMonth: 1,
      entries: {
        "1_1_dining": "=100000",
        "1_1_income": "=500000",
        "1_2_shopping": "200000+300000",
        "1_2_remark": "Dinner",
        "2_3_rent": "=700000",
      },
      settings: { budget_1: "1000000", budget_2: "500000" },
    });

    expect(model.annual.income).toBe(500000);
    expect(model.annual.expense).toBe(1300000);
    expect(model.annual.net).toBe(-800000);
    expect(model.annual.recordedDays).toBe(3);
    expect(model.annual.expenseDays).toBe(3);
    expect(model.annual.averageExpensePerExpenseDay).toBeCloseTo(433333.33, 2);
    expect(model.annual.peakExpenseDay).toMatchObject({ month: 2, day: 3, amount: 700000 });

    const dining = model.annual.categories.find((category) => category.id === "dining");
    const shopping = model.annual.categories.find((category) => category.id === "shopping");
    expect(dining.value).toBe(100000);
    expect(shopping.value).toBe(500000);
    expect(shopping.share).toBeCloseTo(500000 / 1300000, 8);
  });

  it("builds twelve monthly trend points with per-month budgets", () => {
    const model = buildAnalyticsViewModel({
      year: 2026,
      activeMonth: 3,
      entries: {
        "1_1_dining": "100",
        "1_1_income": "1000",
        "3_5_transport": "=200",
        "3_5_income": "=800",
      },
      settings: { budget_1: "500", monthlyBudget: "1000" },
    });

    expect(model.months).toHaveLength(12);
    expect(model.months[0]).toMatchObject({ month: 1, income: 1000, expense: 100, budget: 500, net: 900 });
    expect(model.months[2]).toMatchObject({ month: 3, income: 800, expense: 200, budget: 1000, net: 600 });
    expect(model.activeMonth).toMatchObject({ month: 3, expense: 200, budget: 1000 });
    expect(model.annual.budget.total).toBe(11500);
    expect(model.annual.budget.monthsWithData).toBe(2);
    expect(model.annual.budget.monthsWithinBudget).toBe(2);
  });

  it("sums effective monthly budgets without letting one override change another month", () => {
    const model = buildAnalyticsViewModel({
      year: 2026,
      activeMonth: 8,
      entries: {},
      settings: { monthlyBudget: 1000, budget_2: 1500, budget_8: 2000 },
    });

    expect(model.months[0].budget).toBe(1000);
    expect(model.months[1].budget).toBe(1500);
    expect(model.months[7].budget).toBe(2000);
    expect(model.annual.budget.total).toBe(13500);
  });

  it("keeps savings rate unavailable when there is no income", () => {
    const model = buildAnalyticsViewModel({
      year: 2026,
      activeMonth: 1,
      entries: { "1_1_dining": "100" },
      settings: {},
    });

    expect(model.annual.savingsRate).toBeNull();
    expect(model.annual.peakExpenseDay.dateKey).toBe("2026-01-01");
  });

  it("counts a remark-only day as recorded without treating it as expense", () => {
    const model = buildAnalyticsViewModel({
      year: 2026,
      activeMonth: 4,
      entries: { "4_9_remark": "note" },
      settings: {},
    });

    expect(model.annual.recordedDays).toBe(1);
    expect(model.annual.expenseDays).toBe(0);
    expect(model.annual.peakExpenseDay).toBeNull();
  });
});
