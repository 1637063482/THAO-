import { beforeEach, describe, expect, it } from "vitest";

describe("analytics controller", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="analysis-root"></div>';
  });

  it("mounts the analytics view and refreshes it from the current ledger state", async () => {
    const { state } = await import("../../src/js/state.js");
    state.activeYear = 2026;
    state.activeMonthId = 2;
    state.appState = {
      balances: {},
      entries: { "2_4_income": "1000", "2_4_dining": "250" },
      settings: { budget_2: "500" },
    };

    const { mountAnalyticsView, refreshAnalyticsView } = await import("../../src/features/analytics/controller.js");
    mountAnalyticsView();
    refreshAnalyticsView();

    expect(document.getElementById("analysis-root").dataset.analyticsRendered).toBe("true");
    expect(document.getElementById("analytics-yearly-income").textContent).toBe("₫ 1,000");
    expect(document.getElementById("analytics-monthly-expense").textContent).toBe("₫ 250");
  });
});
