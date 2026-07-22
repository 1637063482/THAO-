import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock state module for ViewModel testing
vi.mock("../../src/js/state.js", () => ({
  state: {
    activeYear: 2026,
    activeMonthId: 3,
    appState: {
      balances: {},
      entries: {},
      settings: { budget_3: "5000000" },
    },
  },
}));

vi.mock("../../src/js/config.js", () => ({
  expenseCategories: [
    { id: "dining", nameKey: "category_dining", emoji: "🍜" },
    { id: "shopping", nameKey: "category_shopping", emoji: "👕" },
    { id: "rent", nameKey: "category_rent", emoji: "🏠" },
    { id: "transport", nameKey: "category_transport", emoji: "🚗" },
  ],
  DEFAULT_BUDGET_VND: 15000000,
}));

describe("dashboard ViewModel", () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset the mock state entries
    const { state } = require("../../src/js/state.js");
    state.appState.entries = {};
    state.appState.settings = { budget_3: "5000000" };
  });

  it("exports buildDashboardViewModel function", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    expect(vm.buildDashboardViewModel).toBeTypeOf("function");
  });

  it("computes zero budget remaining when no entries exist", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.budgetRemaining).toBe(5000000);
    expect(result.totalSpending).toBe(0);
    expect(result.totalIncome).toBe(0);
    expect(result.todaySpending).toBe(0);
  });

  it("computes budget remaining after spending", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_5_dining": "=200000",
      "3_5_shopping": "=300000",
      "3_10_rent": "=1000000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.totalSpending).toBe(1500000);
    expect(result.budgetRemaining).toBe(3500000);
  });

  it("aggregates spending by category", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_1_dining": "=100000",
      "3_2_dining": "=200000",
      "3_3_shopping": "=500000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.byCategory.dining).toBe(300000);
    expect(result.byCategory.shopping).toBe(500000);
  });

  it("returns top 3 categories by spending", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_1_dining": "=500000",
      "3_2_shopping": "=800000",
      "3_3_rent": "=3000000",
      "3_4_transport": "=100000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.topCategories).toHaveLength(3);
    expect(result.topCategories[0].id).toBe("rent");
    expect(result.topCategories[1].id).toBe("shopping");
  });

  it("computes today spending when entries exist for today", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_15_dining": "=150000",
      "3_15_shopping": "=250000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, today: 15, state });

    expect(result.todaySpending).toBe(400000);
  });

  it("returns spending by day for recent entries", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_10_dining": "=100000",
      "3_10_shopping": "=200000",
      "3_12_rent": "=1000000",
      "3_12_income": "=5000000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.days).toBeDefined();
    expect(result.days.length).toBeGreaterThanOrEqual(2);
    // Each day should have a dateKey, totalSpending, and categories
    var day10 = result.days.find(function (d) { return d.day === 10; });
    expect(day10).toBeDefined();
    expect(day10.totalSpending).toBe(300000);
    expect(day10.totalIncome).toBe(0);
  });

  it("handles empty entries gracefully with no data flags", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {};

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(result.noData).toBe(true);
    expect(result.totalSpending).toBe(0);
    expect(result.topCategories).toEqual([]);
    expect(result.days).toEqual([]);
  });

  it("returns streak data from the streak module", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = {
      "3_14_dining": "=50000",
      "3_15_dining": "=50000",
    };

    const result = vm.buildDashboardViewModel({ year: 2026, month: 3, today: 15 });

    // streak property exists
    expect(result.streak).toBeDefined();
    expect(typeof result.streak).toBe("object");
  });

  it("does not modify the input state object", async () => {
    const vm = await import("../../src/js/dashboard-view-model.js");
    const { state } = await import("../../src/js/state.js");
    state.appState.entries = { "3_1_dining": "=100000" };
    var entriesBefore = JSON.stringify(state.appState.entries);

    vm.buildDashboardViewModel({ year: 2026, month: 3, state });

    expect(JSON.stringify(state.appState.entries)).toBe(entriesBefore);
  });
});
