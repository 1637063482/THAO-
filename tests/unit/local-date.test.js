import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/fireworks.js", () => ({
  Fireworks: { launch: vi.fn() },
}));

vi.mock("../../src/js/sync.js", () => ({
  triggerCloudSave: vi.fn(),
  setupRealtimeListener: vi.fn(),
  teardownListener: vi.fn(),
  importData: vi.fn(),
}));

vi.mock("../../src/js/charts.js", () => ({
  initCharts: vi.fn(),
  updateCharts: vi.fn(),
}));

vi.mock("../../src/js/auth.js", () => ({
  initAuth: vi.fn(),
  handleLogin: vi.fn(),
  logoutApp: vi.fn(),
  updateActivityTime: vi.fn(),
}));

vi.mock("../../src/js/icons.js", () => ({
  Icons: {
    flame: () => "",
    check: () => "",
  },
  initIcons: vi.fn(),
}));

import { state } from "../../src/js/state.js";
import { getLedgerStreakDate, getLedgerToday } from "../../src/js/clock.js";
import { openQuickAdd, submitQuickAdd } from "../../src/js/quick-add.js";
import { renderMonthTable, renderStreakPanel } from "../../src/js/render.js";
import { getAppDropdownValue, renderAppDropdown } from "../../src/components/feedback/app-dropdown.js";

function resetState() {
  state.activeYear = 2026;
  state.activeMonthId = 2;
  state.currentCurrency = "VND";
  state.appState = { balances: {}, entries: {}, settings: {} };
  state.previousYearEntries = {};
  state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
}

describe("Vietnam ledger clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLElement.prototype.scrollTo = vi.fn();
    resetState();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("uses Asia/Ho_Chi_Minh across midnight instead of the runner timezone", () => {
    expect(getLedgerToday(new Date("2026-02-28T16:59:59.000Z"))).toMatchObject({ year: 2026, month: 2, day: 28, dateKey: "2026-02-28" });
    expect(getLedgerToday(new Date("2026-02-28T17:00:00.000Z"))).toMatchObject({ year: 2026, month: 3, day: 1, dateKey: "2026-03-01" });
  });

  it("does not treat China midnight as Vietnam midnight", () => {
    expect(getLedgerToday(new Date("2026-03-31T16:30:00.000Z"))).toMatchObject({ year: 2026, month: 3, day: 31, dateKey: "2026-03-31" });
  });

  it("normalizes the streak anchor to the same Vietnam ledger day", () => {
    expect(getLedgerStreakDate(new Date("2026-02-28T16:59:59.000Z")).toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(getLedgerStreakDate(new Date("2026-02-28T17:00:00.000Z")).toISOString()).toBe("2026-03-01T12:00:00.000Z");
  });

  it("handles leap day, month end, and year end with the Vietnam ledger date", () => {
    expect(getLedgerToday(new Date("2028-02-29T16:59:59.000Z"))).toMatchObject({ year: 2028, month: 2, day: 29 });
    expect(getLedgerToday(new Date("2028-02-29T17:00:00.000Z"))).toMatchObject({ year: 2028, month: 3, day: 1 });
    expect(getLedgerToday(new Date("2026-12-31T17:00:00.000Z"))).toMatchObject({ year: 2027, month: 1, day: 1 });
  });

  it("updates quick-add default day when the app crosses Vietnam midnight without reload", async () => {
    vi.setSystemTime(new Date("2026-02-28T16:59:59.000Z"));
    document.body.innerHTML = [
      '<div id="quick-add-modal"></div>',
      '<div id="quick-add-panel"></div>',
      renderAppDropdown({ id: "qa-day" }),
      renderAppDropdown({ id: "qa-cat" }),
      '<input id="qa-amount">',
    ].join("");
    state.activeYear = 2026;
    state.activeMonthId = 2;
    openQuickAdd();
    expect(getAppDropdownValue(document.getElementById("qa-day"))).toBe("28");

    vi.setSystemTime(new Date("2026-02-28T17:00:00.000Z"));
    state.activeMonthId = 3;
    openQuickAdd();

    expect(getAppDropdownValue(document.getElementById("qa-day"))).toBe("1");
  });

  it("moves the highlighted today row after month-end without reloading modules", () => {
    vi.setSystemTime(new Date("2026-02-28T16:59:59.000Z"));
    document.body.innerHTML = '<div id="months-container"></div><span id="monthly-chart-title"></span>';
    renderMonthTable(2);
    expect(document.getElementById("row-2-28").className).toContain("row-today");

    vi.setSystemTime(new Date("2026-02-28T17:00:00.000Z"));
    state.activeMonthId = 3;
    renderMonthTable(3);

    expect(document.getElementById("row-3-1").className).toContain("row-today");
  });

  it("refreshes streak when the visible ledger date changes", () => {
    vi.setSystemTime(new Date("2026-02-28T16:59:59.000Z"));
    document.body.innerHTML = '<section id="streak-panel"></section>';
    state.appState.entries = { "2_28_dining": "100000" };
    renderStreakPanel();
    expect(document.getElementById("streak-panel").textContent).toMatch(/\d+/);

    vi.setSystemTime(new Date("2026-02-28T17:00:00.000Z"));
    state.appState.entries = { "3_1_dining": "100000" };
    renderStreakPanel();

    expect(document.getElementById("streak-panel").textContent).toMatch(/\d+/);
  });

  it("refreshes the current ledger month on visibilitychange after Vietnam midnight", async () => {
    vi.setSystemTime(new Date("2026-02-28T16:59:59.000Z"));
    document.body.innerHTML = [
      renderAppDropdown({ id: "year-selector" }),
      '<span id="ui-year-start"></span>',
      '<span id="ui-year-end"></span>',
      '<div id="months-container"></div>',
      '<span id="monthly-chart-title"></span>',
      '<section id="streak-panel"></section>',
    ].join("");
    state.activeYear = 2026;
    state.activeMonthId = 2;
    state.appState.entries = { "2_28_dining": "100000" };
    await import("../../src/js/main.js");
    renderStreakPanel();
    expect(state.currentStreak).toBe(1);

    vi.setSystemTime(new Date("2026-02-28T17:00:00.000Z"));
    document.dispatchEvent(new Event("visibilitychange"));

    expect(state.activeYear).toBe(2026);
    expect(state.activeMonthId).toBe(3);
    expect(document.getElementById("row-3-1").className).toContain("row-today");
    expect(state.currentStreak).toBe(0);
  });

  it("refreshes a continuously visible app at Vietnam midnight without focus or visibility events", async () => {
    vi.setSystemTime(new Date("2026-02-28T16:59:59.000Z"));
    document.body.innerHTML = [
      renderAppDropdown({ id: "year-selector" }),
      '<span id="ui-year-start"></span>',
      '<span id="ui-year-end"></span>',
      '<div id="quick-add-modal"></div>',
      '<div id="quick-add-panel"></div>',
      renderAppDropdown({ id: "qa-day" }),
      renderAppDropdown({ id: "qa-cat", value: "income", options: [{ value: "income", label: "income", selected: true }] }),
      '<input id="qa-amount" value="50000">',
      '<input id="qa-remark" value="">',
      '<div id="months-container"></div>',
      '<span id="monthly-chart-title"></span>',
      '<section id="streak-panel"></section>',
    ].join("");
    state.activeYear = 2026;
    state.activeMonthId = 2;
    state.appState.entries = { "2_28_dining": "100000" };
    await import("../../src/js/main.js?continuous-visible-midnight");
    renderMonthTable(2);
    renderStreakPanel();
    expect(document.getElementById("row-2-28").className).toContain("row-today");
    expect(state.currentStreak).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(state.activeYear).toBe(2026);
    expect(state.activeMonthId).toBe(3);
    expect(document.getElementById("row-3-1").className).toContain("row-today");
    expect(state.currentStreak).toBe(0);

    openQuickAdd();
    expect(getAppDropdownValue(document.getElementById("qa-day"))).toBe("1");
    submitQuickAdd();

    expect(state.appState.entries["3_1_income"]).toBe("=50000");
    expect(state.appState.entries["2_1_income"]).toBeUndefined();
    expect(state.currentStreak).toBe(2);
  });
});
