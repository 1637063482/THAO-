import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
    check: () => "",
    flame: () => "",
  },
  initIcons: vi.fn(),
}));

import { state } from "../../src/js/state.js";
import { convertCnyAmountToVnd, formatVndForCurrencyDisplay } from "../../src/js/currency-view.js";
import { renderMonthTable } from "../../src/js/render.js";
import { submitQuickAdd } from "../../src/js/quick-add.js";
import { triggerCloudSave } from "../../src/js/sync.js";
import { renderAppDropdown } from "../../src/components/feedback/app-dropdown.js";

function mountShell(extraHtml = "") {
  document.body.innerHTML = [
    '<select id="year-selector"></select>',
    '<span id="display-year-text"></span>',
    '<span id="ui-year-start"></span>',
    '<span id="ui-year-end"></span>',
    '<button id="btn-curr-vnd"></button>',
    '<button id="btn-curr-cny"></button>',
    '<div id="fx-panel" class="hidden"></div>',
    '<div id="months-container"></div>',
    '<span id="monthly-chart-title"></span>',
    '<section id="streak-panel"></section>',
    '<input id="monthly-budget-input">',
    '<div id="budget-progress-bar"></div>',
    '<div id="budget-text"></div>',
    extraHtml,
  ].join("");
  HTMLElement.prototype.scrollTo = vi.fn();
}

function resetState() {
  state.activeYear = 2026;
  state.activeMonthId = 1;
  state.currentCurrency = "VND";
  state.fxMode = "auto";
  state.fxRateAuto = 3500;
  state.fxRateManual = 4200;
  state.appState = { balances: {}, entries: {}, settings: {} };
  state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
  state.previousYearEntries = {};
  state.yearlyCatSums = {};
  state.monthlyCatSums = {};
}

function snapshotPersistence() {
  return JSON.stringify({
    appState: state.appState,
    pendingUpdates: state.pendingUpdates,
  });
}

describe("currency view", () => {
  beforeAll(async () => {
    mountShell();
    await import("../../src/js/main.js?currency-view");
  });

  beforeEach(() => {
    resetState();
    mountShell();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats large, zero, and decimal VND values for VND and CNY views", () => {
    expect(formatVndForCurrencyDisplay(123456789, "VND", 3500)).toBe("123,456,789");
    expect(formatVndForCurrencyDisplay(123456789, "CNY", 3500)).toBe("35,273.37");
    expect(formatVndForCurrencyDisplay(0, "CNY", 3500)).toBe("0.00");
    expect(formatVndForCurrencyDisplay(4375, "CNY", 3500)).toBe("1.25");
    expect(convertCnyAmountToVnd("1.25", 4000)).toBe("5000");
    expect(convertCnyAmountToVnd("1e6", 4000)).toBeNull();
  });

  it("marks every category total in the ledger footer as privacy-sensitive", () => {
    renderMonthTable(1);

    const totals = Array.from(document.querySelectorAll('tfoot span[id^="sum-1-"]'));
    expect(totals).toHaveLength(12);
    expect(totals.every(element => element.classList.contains("blur-sensitive"))).toBe(true);
  });

  it("keeps VND raw unchanged when a CNY field is focused and blurred without edits", () => {
    state.currentCurrency = "CNY";
    state.fxRateAuto = 3500;
    const before = snapshotPersistence();
    document.body.innerHTML += '<input id="entry-1-1-dining" class="cell-input" data-type="entry" data-key="1_1_dining" data-raw="1234" value="0.35">';

    const input = document.getElementById("entry-1-1-dining");
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(input.value).toBe("0.35");

    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(input.dataset.raw).toBe("1234");
    expect(snapshotPersistence()).toBe(before);
  });

  it("reconciles state and pending when a CNY no-op-equivalent input restores the original VND fact", () => {
    state.currentCurrency = "CNY";
    state.fxRateAuto = 3500;
    state.appState.entries = { "1_1_dining": "1234" };
    state.pendingUpdates.entries = { "1_1_dining": "1234" };
    document.body.innerHTML += '<input id="entry-1-1-dining" class="cell-input" data-type="entry" data-key="1_1_dining" data-raw="1234" value="0.35">';

    const input = document.getElementById("entry-1-1-dining");
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.value = "0.35";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(input.dataset.raw).toBe("1234");
    expect(state.appState.entries["1_1_dining"]).toBe("1234");
    expect(state.pendingUpdates.entries["1_1_dining"]).toBe("1234");
  });

  it("defers CNY direct-cell persistence until blur so delayed cloud saves cannot send rounded VND", async () => {
    vi.useFakeTimers();
    state.currentCurrency = "CNY";
    state.fxRateAuto = 3500;
    state.appState.entries = { "1_1_dining": "1234" };
    state.pendingUpdates.entries = { "1_1_dining": "1234" };
    document.body.innerHTML += '<input id="entry-1-1-dining" class="cell-input" data-type="entry" data-key="1_1_dining" data-raw="1234" value="0.35">';

    const input = document.getElementById("entry-1-1-dining");
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.value = "0.35";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.advanceTimersByTimeAsync(900);

    expect(state.appState.entries["1_1_dining"]).toBe("1234");
    expect(state.pendingUpdates.entries["1_1_dining"]).toBe("1234");
    expect(triggerCloudSave).not.toHaveBeenCalled();

    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(input.dataset.raw).toBe("1234");
    expect(state.appState.entries["1_1_dining"]).toBe("1234");
    expect(state.pendingUpdates.entries["1_1_dining"]).toBe("1234");
    expect(triggerCloudSave).toHaveBeenCalledTimes(1);
  });

  it("does not convert direct CNY edits through an unavailable automatic FX rate", () => {
    state.currentCurrency = "CNY";
    state.fxMode = "auto";
    state.fxRateAuto = null;
    const before = snapshotPersistence();
    document.body.innerHTML += '<input id="entry-1-1-dining" class="cell-input" data-type="entry" data-key="1_1_dining" data-raw="" value="">';

    const input = document.getElementById("entry-1-1-dining");
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.value = "1.25";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(input.dataset.raw).toBe("");
    expect(snapshotPersistence()).toBe(before);
    expect(triggerCloudSave).not.toHaveBeenCalled();
  });

  it("does not persist an exponent in a direct CNY edit", () => {
    state.currentCurrency = "CNY";
    state.fxRateAuto = 3500;
    state.appState.entries = { "1_1_dining": "1234" };
    state.pendingUpdates.entries = { "1_1_dining": "1234" };
    document.body.innerHTML += '<input id="entry-1-1-dining" class="cell-input" data-type="entry" data-key="1_1_dining" data-raw="1234" value="0.35">';

    const input = document.getElementById("entry-1-1-dining");
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.value = "1e6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(state.appState.entries["1_1_dining"]).toBe("1234");
    expect(state.pendingUpdates.entries["1_1_dining"]).toBe("1234");
    expect(input.dataset.raw).toBe("1234");
  });

  it("does not persist or render a budget through an unavailable automatic FX rate", async () => {
    const { saveBudgetAndCalculate, updateBudgetProgress } = await import("../../src/js/budget.js");
    state.currentCurrency = "CNY";
    state.fxMode = "auto";
    state.fxRateAuto = null;
    state.appState.settings = {};
    const input = document.getElementById("monthly-budget-input");
    input.value = "1000";

    saveBudgetAndCalculate();
    updateBudgetProgress();

    expect(state.appState.settings).toEqual({});
    expect(document.getElementById("budget-text").textContent).not.toContain("NaN");
  });

  it("does not change state or pending updates after 100 CNY/VND display switches", () => {
    state.appState.entries = {
      "1_1_dining": "123456789",
      "1_2_income": "=3500.5",
      "1_3_shopping": "0",
    };
    state.appState.balances = {
      "bal-bank": "999999999",
      "end-bal-bank": "1000000000",
    };
    state.pendingUpdates = {
      balances: { "bal-bank": "999999999" },
      entries: { "1_2_income": "=3500.5" },
      settings: {},
    };
    const before = snapshotPersistence();

    for (let i = 0; i < 100; i++) {
      window.switchCurrency("CNY");
      window.switchCurrency("VND");
    }

    expect(snapshotPersistence()).toBe(before);
    expect(document.getElementById("entry-1-1-dining").dataset.raw).toBe("123456789");
    expect(document.getElementById("entry-1-2-income").dataset.raw).toBe("=3500.5");
  // This stress case rebuilds the 31-day ledger twice per iteration.
  }, 30000);

  it("converts Quick Add CNY input to VND exactly once at submit time", () => {
    state.currentCurrency = "CNY";
    state.fxMode = "manual";
    state.fxRateManual = 4000;
    mountShell([
      '<div id="quick-add-modal"></div>',
      '<div id="quick-add-panel"></div>',
      renderAppDropdown({ id: "qa-day", value: "1", options: [{ value: "1", label: "1", selected: true }] }),
      renderAppDropdown({ id: "qa-cat", value: "income", options: [{ value: "income", label: "income", selected: true }] }),
      '<input id="qa-amount" value="1.25">',
      '<input id="qa-remark" value="">',
      '<input id="entry-1-1-income">',
    ].join(""));

    submitQuickAdd();

    expect(state.appState.entries["1_1_income"]).toBe("=5000");
    expect(state.pendingUpdates.entries["1_1_income"]).toBe("=5000");
    expect(state.appState.entries["1_1_income"]).not.toBe("=20000000");
  });

  it("does not convert Quick Add CNY input through an unavailable automatic FX rate", () => {
    state.currentCurrency = "CNY";
    state.fxMode = "auto";
    state.fxRateAuto = null;
    mountShell([
      '<div id="toast"></div>',
      '<div id="toast-icon"></div>',
      '<div id="toast-msg"></div>',
      '<div id="quick-add-modal"></div>',
      '<div id="quick-add-panel"></div>',
      renderAppDropdown({ id: "qa-day", value: "1", options: [{ value: "1", label: "1", selected: true }] }),
      renderAppDropdown({ id: "qa-cat", value: "income", options: [{ value: "income", label: "income", selected: true }] }),
      '<input id="qa-amount" value="1.25">',
      '<input id="qa-remark" value="">',
      '<input id="entry-1-1-income">',
    ].join(""));
    const before = snapshotPersistence();

    submitQuickAdd();

    expect(snapshotPersistence()).toBe(before);
    expect(triggerCloudSave).not.toHaveBeenCalled();
    expect(document.getElementById("toast-msg").innerText).toContain("khả dụng");
  });
});
