import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/sync.js", () => ({ triggerCloudSave: vi.fn() }));
vi.mock("../../src/js/charts.js", () => ({ updateCharts: vi.fn() }));
vi.mock("../../src/features/analytics/controller.js", () => ({ refreshAnalyticsView: vi.fn() }));

import { buildAnalyticsViewModel } from "../../src/features/analytics/model.js";
import { createSavingsController } from "../../src/features/savings/controller.js";
import { buildDashboardViewModel } from "../../src/js/dashboard-view-model.js";
import { calculateAll, getRawBudgetVND } from "../../src/js/budget.js";
import { buildLegacyStreak } from "../../src/js/streak.js";
import { state } from "../../src/js/state.js";
import { interpretLedger } from "../../src/domain/ledger-interpreter.js";

const fixture = {
  year: 2024,
  activeMonth: 2,
  entries: {
    "2_29_income": 1000,
    "2_29_dining": "200+300",
    "2_29_shopping": 0,
    "2_29_remark": "Leap-day note",
    "2_30_rent": "900",
    "2_29_unknown": "900",
    "3_1_income": "800",
    "3_1_dining": "-100",
    "3_1_remark": "zero expense day",
    "4_31_other": "700",
  },
  settings: {
    monthlyBudget: "10000",
    budget_2: "5000+1000",
    budget_3: "-1",
    budget_4: "not-a-budget",
  },
};

describe("canonical ledger interpreter", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="savings-root"></div>';
    state.activeYear = fixture.year;
    state.activeMonthId = fixture.activeMonth;
    state.appState = { balances: {}, entries: { ...fixture.entries }, settings: { ...fixture.settings } };
    state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
    state.monthlyCatSums = {};
    state.yearlyCatSums = {};
  });

  it("gives every consumer the same leap-day totals and fallback budget", () => {
    const interpreted = interpretLedger(fixture);
    const february = interpreted.months[1];

    expect(february).toMatchObject({
      income: 1000,
      expense: 500,
      net: 500,
      budget: 6000,
      recordedDays: 1,
      expenseDays: 1,
    });
    expect(february.categories.dining).toBe(500);
    expect(interpreted.activityDates).toEqual(["2024-02-29", "2024-03-01"]);

    const dashboard = buildDashboardViewModel({
      year: fixture.year,
      month: fixture.activeMonth,
      state: { appState: state.appState },
      today: 29,
      streakDate: new Date("2024-03-01T05:00:00.000Z"),
    });
    expect(dashboard).toMatchObject({ totalIncome: 1000, totalSpending: 500, budgetVnd: 6000 });
    expect(dashboard.byCategory.dining).toBe(500);

    const analytics = buildAnalyticsViewModel({
      year: fixture.year,
      activeMonth: fixture.activeMonth,
      entries: fixture.entries,
      settings: fixture.settings,
    });
    expect(analytics.annual).toMatchObject({ income: 1800, expense: 500, recordedDays: 2, expenseDays: 1 });
    expect(analytics.months[1]).toMatchObject({ income: 1000, expense: 500, budget: 6000 });

    calculateAll();
    expect(state.monthlyCatSums[2].dining).toBe(500);
    expect(getRawBudgetVND()).toBe(6000);

    expect(buildLegacyStreak(fixture.entries, fixture.year, new Date("2024-03-01T05:00:00.000Z")).streak).toBe(2);
  });

  it("feeds the same interpreted amounts into savings actuals", () => {
    const controller = createSavingsController({
      root: document.getElementById("savings-root"),
      getSavingsState: () => ({ settings: fixture.settings, pendingUpdates: {}, month: fixture.activeMonth }),
      getDashboardViewModel: (month) => buildDashboardViewModel({ year: fixture.year, month, state: { appState: state.appState } }),
      formatMoney: (value) => String(value),
    });

    controller.start();

    expect(document.querySelector(".savings-actual-value").textContent).toBe("500");
    expect(document.querySelector(".savings-metric:nth-of-type(2)").textContent).toContain("1300");
    controller.stop();
  });
});
