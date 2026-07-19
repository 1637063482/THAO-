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
import { submitQuickAdd } from "../../src/js/quick-add.js";
import { triggerCloudSave } from "../../src/js/sync.js";

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
    expect(formatVndForCurrencyDisplay(123456789, "CNY", 3500)).toBe("35273.37");
    expect(formatVndForCurrencyDisplay(0, "CNY", 3500)).toBe("0.00");
    expect(formatVndForCurrencyDisplay(4375, "CNY", 3500)).toBe("1.25");
    expect(convertCnyAmountToVnd("1.25", 4000)).toBe("5000");
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
  }, 15000);

  it("converts Quick Add CNY input to VND exactly once at submit time", () => {
    state.currentCurrency = "CNY";
    state.fxMode = "manual";
    state.fxRateManual = 4000;
    mountShell([
      '<div id="quick-add-modal"></div>',
      '<div id="quick-add-panel"></div>',
      '<select id="qa-day"><option value="1" selected>1</option></select>',
      '<select id="qa-cat"><option value="income" selected>income</option></select>',
      '<input id="qa-amount" value="1.25">',
      '<input id="qa-remark" value="">',
      '<input id="entry-1-1-income">',
    ].join(""));

    submitQuickAdd();

    expect(state.appState.entries["1_1_income"]).toBe("=5000");
    expect(state.pendingUpdates.entries["1_1_income"]).toBe("=5000");
    expect(state.appState.entries["1_1_income"]).not.toBe("=20000000");
  });
});
