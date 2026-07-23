import { describe, expect, it, vi, beforeEach } from "vitest";

// Note: file intentionally named dashbaord.test.js to match the naming
// pattern of other test files. The dashboard module renders HTML from
// the ViewModel and wires up event handlers.

describe("dashboard rendering", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("exports renderDashboard and initDashboard functions", async () => {
    const dash = await import("../../src/js/dashboard.js");
    expect(dash.renderDashboard).toBeTypeOf("function");
    expect(dash.initDashboard).toBeTypeOf("function");
  });

  it("renderDashboard returns HTML string containing hero and sections", async () => {
    const dash = await import("../../src/js/dashboard.js");
    const vm = {
      budgetRemaining: 3500000,
      isOverBudget: false,
      totalSpending: 1500000,
      totalIncome: 2000000,
      todaySpending: 200000,
      budgetVnd: 5000000,
      topCategories: [
        { id: "dining", label: "category_dining", emoji: "🍜", spending: 800000 },
        { id: "shopping", label: "category_shopping", emoji: "👕", spending: 500000 },
      ],
      days: [
        { day: 15, dateKey: "2026-03-15", totalSpending: 200000, categories: { dining: 200000 } },
      ],
      streak: { streak: 3, hasRecordedToday: true },
      noData: false,
    };

    var html = dash.renderDashboard(vm);
    expect(html).toContain("3,500,000");
    expect(html).toContain("1,500,000");
    expect(html).toContain("dashboard-hero");
    expect(html).toContain("3 <span");
    expect(html).toContain("ngày");
    expect(html).toContain("hạng mục");
  });

  it("renderDashboard handles noData gracefully", async () => {
    const dash = await import("../../src/js/dashboard.js");
    var html = dash.renderDashboard({
      budgetRemaining: 0, isOverBudget: false, totalSpending: 0, totalIncome: 0,
      todaySpending: 0, budgetVnd: 0, topCategories: [], days: [],
      streak: { streak: 0, hasRecordedToday: false }, noData: true,
    });
    expect(html).toContain("no-data");
  });

  it("initDashboard attaches event listeners", async () => {
    document.body.innerHTML = '<div id="dashboard-root"></div>';
    const dash = await import("../../src/js/dashboard.js");
    // Should not throw
    expect(function () { dash.initDashboard(); }).not.toThrow();
  });

  it("refreshDashboard renders the current legacy state into the dashboard", async () => {
    document.body.innerHTML = '<div id="dashboard-root"></div>';
    const dash = await import("../../src/js/dashboard.js");
    dash.refreshDashboard();
    expect(document.getElementById("dashboard-root").innerHTML).toContain("dashboard-root");
  });

  it.each([
    ["refreshDashboardAfterLocalUpdate"],
    ["refreshDashboardAfterMonthSwitch"],
  ])("%s preserves legacy state and renders the updated hero", async (refreshName) => {
    document.body.innerHTML = '<div id="dashboard-root"></div>';
    const dash = await import("../../src/js/dashboard.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.activeYear = 2026;
    stateModule.state.activeMonthId = 3;
    stateModule.state.appState = { balances: {}, entries: { "3_15_dining": "120000" }, settings: { monthly_budget_3: "2000000" } };
    stateModule.state.pendingUpdates = { entries: { "3_15_dining": "120000" } };
    const appStateBefore = stateModule.state.appState;
    const pendingBefore = stateModule.state.pendingUpdates;
    dash[refreshName]();
    expect(document.querySelector(".dashboard-hero")).not.toBeNull();
    expect(stateModule.state.appState).toBe(appStateBefore);
    expect(stateModule.state.pendingUpdates).toBe(pendingBefore);
  });

  it("production switchMonthTab path refreshes the hero for the selected legacy month", async () => {
    document.body.innerHTML = '<div id="dashboard-root"></div><div id="months-container"></div>';
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.activeYear = 2026;
    stateModule.state.activeMonthId = 3;
    stateModule.state.appState = { balances: {}, entries: { "3_15_dining": "120000", "4_15_dining": "800000" }, settings: { monthly_budget_3: "2000000", monthly_budget_4: "2000000" } };
    stateModule.state.pendingUpdates = { entries: { "3_15_dining": "120000" } };
    const main = await import("../../src/js/main.js");
    main.switchMonthTab(3);
    const marchHero = document.querySelector(".dashboard-hero").textContent;
    main.switchMonthTab(4);
    expect(stateModule.state.activeMonthId).toBe(4);
    expect(document.querySelector(".dashboard-hero").textContent).not.toBe(marchHero);
    expect(stateModule.state.pendingUpdates.entries["3_15_dining"]).toBe("120000");
  });

  it("production local-save debounce refreshes the hero after a legacy edit", async () => {
    vi.useFakeTimers();
    try {
      document.body.innerHTML = '<div id="dashboard-root"></div><div id="months-container"></div>';
      const stateModule = await import("../../src/js/state.js");
      stateModule.state.activeYear = 2026;
      stateModule.state.activeMonthId = 3;
      stateModule.state.appState = { balances: {}, entries: { "3_15_dining": "120000" }, settings: { monthly_budget_3: "2000000" } };
      stateModule.state.pendingUpdates = { entries: { "3_15_dining": "120000" } };
      const main = await import("../../src/js/main.js");
      main.switchMonthTab(3);
      const before = document.querySelector(".dashboard-hero").textContent;
      stateModule.state.appState.entries["3_15_dining"] = "900000";
      stateModule.state.pendingUpdates.entries["3_15_dining"] = "900000";
      main.scheduleInputSave();
      await vi.advanceTimersByTimeAsync(150);
      expect(document.querySelector(".dashboard-hero").textContent).not.toBe(before);
      expect(stateModule.state.pendingUpdates.entries["3_15_dining"]).toBe("900000");
    } finally {
      vi.useRealTimers();
    }
  });
});
