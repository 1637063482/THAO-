import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/sync.js", () => ({
  triggerCloudSave: vi.fn(),
}));

vi.mock("../../src/js/charts.js", () => ({
  updateCharts: vi.fn(),
}));

import { state } from "../../src/js/state.js";

describe("per-month budget persistence", () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="monthly-budget-input" value="">';
    localStorage.clear();
    state.activeYear = 2026;
    state.activeMonthId = 8;
    state.currentCurrency = "VND";
    state.appState = { balances: {}, entries: {}, settings: {} };
    state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
  });

  it("saves only the active month and does not mutate the legacy global fallback", async () => {
    const { saveBudgetAndCalculate } = await import("../../src/js/budget.js");
    state.appState.settings = { monthlyBudget: 1000, budget_2: 1000 };
    localStorage.setItem("thao_monthly_budget", "1000");
    document.getElementById("monthly-budget-input").value = "2000";

    saveBudgetAndCalculate();

    expect(state.appState.settings).toEqual({ monthlyBudget: 1000, budget_2: 1000, budget_8: 2000 });
    expect(localStorage.getItem("thao_monthly_budget")).toBe("1000");
  });

  it("prefers the selected month override over the legacy monthly baseline", async () => {
    const { getRawBudgetVND } = await import("../../src/js/budget.js");
    state.appState.settings = { monthlyBudget: 1000, budget_8: 2000 };

    expect(getRawBudgetVND()).toBe(2000);
    state.activeMonthId = 2;
    expect(getRawBudgetVND()).toBe(1000);
  });
});
