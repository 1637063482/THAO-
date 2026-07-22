import { describe, expect, it } from "vitest";
import { createLedgerViewState, toggleLedgerView, setLedgerView } from "../../src/js/day-ledger.js";

describe("ledger view toggle", () => {
  it("defaults to daily on mobile and table on desktop", () => {
    expect(createLedgerViewState(390).view).toBe("daily");
    expect(createLedgerViewState(1440).view).toBe("table");
  });

  it("switches views without changing pending state", () => {
    const state = createLedgerViewState(390, { pendingUpdates: { entries: { "3_1_dining": "100000" } } });
    const toggled = toggleLedgerView(state);
    expect(toggled.view).toBe("table");
    expect(toggled.pendingUpdates).toBe(state.pendingUpdates);
  });

  it("renders daily inputs with the original legacy source key", async () => {
    document.body.innerHTML = '<div id="daily-ledger-container"></div><div id="months-container"></div>';
    const { state } = await import("../../src/js/state.js");
    const { renderDailyLedger } = await import("../../src/js/render.js");
    state.activeYear = 2026;
    state.activeMonthId = 3;
    state.appState = { balances: {}, entries: { "3_1_dining": "100000" }, settings: {} };
    setLedgerView("daily");
    renderDailyLedger(3);
    expect(document.querySelector('[data-key="3_1_dining"]')).not.toBeNull();
    expect(document.getElementById("months-container").classList.contains("ledger-table-hidden")).toBe(true);
  });

  it("refreshes daily cards on the remote soft-update path and preserves pending input", async () => {
    document.body.innerHTML = '<div id="daily-ledger-container"></div><div id="months-container"></div>';
    const { state } = await import("../../src/js/state.js");
    const { renderDailyLedger, softUpdateDOM } = await import("../../src/js/render.js");
    state.activeYear = 2026;
    state.activeMonthId = 3;
    state.appState = { balances: {}, entries: { "3_1_dining": "100000", "3_5_remark": "later note" }, settings: {} };
    state.pendingUpdates = { balances: {}, entries: { "3_1_dining": "100000" }, settings: {} };
    setLedgerView("daily");
    renderDailyLedger(3);
    expect(document.querySelector('.daily-ledger-remark[data-day="5"]').textContent).toBe("later note");
    state.appState.entries["3_1_dining"] = "250000";
    softUpdateDOM();
    expect(document.querySelector('[data-key="3_1_dining"]').value).toContain("250,000");
    expect(state.pendingUpdates.entries["3_1_dining"]).toBe("100000");
  });
});
