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

vi.mock("../../src/js/auth.js", () => ({
  initAuth: vi.fn(),
  handleLogin: vi.fn(),
  logoutApp: vi.fn(),
  updateActivityTime: vi.fn(),
}));

vi.mock("../../src/js/charts.js", () => ({
  initCharts: vi.fn(),
  updateCharts: vi.fn(),
}));

vi.mock("../../src/js/icons.js", () => ({
  Icons: {
    flame: () => "",
    check: () => "",
  },
  initIcons: vi.fn(),
}));

import { state } from "../../src/js/state.js";
import { Fireworks } from "../../src/js/fireworks.js";
import { renderStreakPanel, updateStreakAfterRecord } from "../../src/js/render.js";
import { buildLegacyStreak } from "../../src/js/streak.js";
import { submitQuickAdd } from "../../src/js/quick-add.js";

const FIXED_NOW = new Date("2026-02-03T05:00:00.000Z");
const TODAY = "2026-02-03";
const YESTERDAY = "2026-02-02";

function vietnamDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function resetLedgerDom() {
  document.body.innerHTML = '<section id="streak-panel"></section>';
  state.activeYear = 2026;
  state.activeMonthId = 2;
  state.currentCurrency = "VND";
  state.fxMode = "auto";
  state.fxRateAuto = 3500;
  state.fxRateManual = 3500;
  state.currentUser = null;
  state.appState = { balances: {}, entries: {}, settings: {} };
  state.previousYearEntries = {};
  state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
  state.yearlyCatSums = {};
  state.monthlyCatSums = {};
  state.currentStreak = 0;
}

function setLegacyStreak({ cloudLastDate = TODAY, cloudStreak = 1, localLastDate = TODAY, localStreak = 1 } = {}) {
  state.appState.settings.expense_last_date = cloudLastDate;
  state.appState.settings.expense_streak = String(cloudStreak);
  localStorage.setItem("expense_last_date", localLastDate);
  localStorage.setItem("expense_streak", String(localStreak));
}

function getDisplayedStreak() {
  const text = document.getElementById("streak-panel")?.textContent || "";
  const match = text.match(/(\d+)\s*(天|ngày)/);
  return match ? Number(match[1]) : NaN;
}

function keyForDate(dateStr, category = "dining") {
  const [, month, day] = dateStr.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return `${Number(month)}_${Number(day)}_${category}`;
}

function localDateStringFromUtcMs(ms) {
  return vietnamDateString(new Date(ms));
}

function entriesForStreak(length, { today = new Date(), category = "dining" } = {}) {
  const entries = {};
  const todayMs = Date.UTC(
    Number(vietnamDateString(today).slice(0, 4)),
    Number(vietnamDateString(today).slice(5, 7)) - 1,
    Number(vietnamDateString(today).slice(8, 10)),
    12
  );
  for (let offset = 0; offset < length; offset += 1) {
    entries[keyForDate(localDateStringFromUtcMs(todayMs - offset * 86400000), category)] = "100000";
  }
  return entries;
}

function expectVisibleStreakFromTwoAccountingDays() {
  expect(vietnamDateString()).toBe(TODAY);
  renderStreakPanel();
  expect(getDisplayedStreak()).toBe(2);
}

describe("legacy accounting streak RED", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.clearAllMocks();
    resetLedgerDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([
    {
      name: "pure expenses",
      entries: {
        "2_2_dining": "100000",
        "2_3_dining": "200000",
      },
    },
    {
      name: "pure income",
      entries: {
        "2_2_income": "500000",
        "2_3_income": "600000",
      },
    },
    {
      name: "mixed income and expense",
      entries: {
        "2_2_income": "500000",
        "2_3_dining": "200000",
      },
    },
  ])("derives a 2 day streak from consecutive $name entries", ({ entries }) => {
    state.appState.entries = entries;
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 1, localLastDate: TODAY, localStreak: 1 });

    expectVisibleStreakFromTwoAccountingDays();
  });

  it("derives streak from entries when cloud settings and localStorage disagree", () => {
    state.appState.entries = {
      "2_2_dining": "100000",
      "2_3_dining": "200000",
    };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 1, localLastDate: TODAY, localStreak: 2 });

    expectVisibleStreakFromTwoAccountingDays();
  });

  it("advances after direct table entry creates the second consecutive accounting day", async () => {
    document.body.innerHTML += [
      '<span id="ui-year-start"></span>',
      '<span id="ui-year-end"></span>',
      '<input id="direct-entry" class="cell-input" data-type="entry" data-key="2_3_dining">',
    ].join("");
    state.appState.entries = { "2_2_dining": "100000" };
    setLegacyStreak({ cloudLastDate: YESTERDAY, cloudStreak: 1, localLastDate: YESTERDAY, localStreak: 1 });
    renderStreakPanel();

    await import("../../src/js/main.js");
    const input = document.getElementById("direct-entry");
    input.value = "200000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(getDisplayedStreak()).toBe(2);
  });

  it("uses the same rule after quick add creates the second consecutive accounting day", () => {
    document.body.innerHTML += [
      '<div id="quick-add-modal" style="display:flex"></div>',
      '<div id="quick-add-panel"></div>',
      '<input type="hidden" id="qa-day" value="3">',
      '<select id="qa-cat"><option value="income" selected>income</option></select>',
      '<input id="qa-amount" value="200000">',
      '<input id="qa-remark" value="">',
      '<input id="entry-2-3-income">',
    ].join("");
    state.appState.entries = { "2_2_dining": "100000" };
    setLegacyStreak({ cloudLastDate: YESTERDAY, cloudStreak: 1, localLastDate: TODAY, localStreak: 1 });
    renderStreakPanel();

    submitQuickAdd();

    expect(getDisplayedStreak()).toBe(2);
  });

  it("recomputes streak when quick add backfills the missing historical accounting day", () => {
    document.body.innerHTML += [
      '<div id="quick-add-modal" style="display:flex"></div>',
      '<div id="quick-add-panel"></div>',
      '<input type="hidden" id="qa-day" value="2">',
      '<select id="qa-cat"><option value="income" selected>income</option></select>',
      '<input id="qa-amount" value="200000">',
      '<input id="qa-remark" value="">',
      '<input id="entry-2-2-income">',
    ].join("");
    state.appState.entries = { "2_3_dining": "100000" };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 1, localLastDate: TODAY, localStreak: 1 });
    renderStreakPanel();

    submitQuickAdd();

    expect(state.appState.entries["2_2_income"]).toBe("=200000");
    expect(getDisplayedStreak()).toBe(2);
  });

  it.each([1, 2, 6, 7, 8, 29, 30, 31])("derives a %i day streak from current-year entries", (days) => {
    vi.setSystemTime(new Date("2026-03-31T05:00:00.000Z"));
    state.activeMonthId = 3;
    state.appState.entries = entriesForStreak(days);
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 99, localLastDate: TODAY, localStreak: 99 });

    renderStreakPanel();

    expect(getDisplayedStreak()).toBe(days);
  });

  it("counts multiple income and expense entries on the same day once", () => {
    state.appState.entries = {
      "2_3_income": "500000",
      "2_3_dining": "200000",
      "2_3_transport": "100000",
    };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 3, localLastDate: TODAY, localStreak: 3 });

    renderStreakPanel();

    expect(getDisplayedStreak()).toBe(1);
  });

  it("starts from 1 when yesterday has no valid accounting entry", () => {
    state.appState.entries = {
      "2_1_dining": "100000",
      "2_3_dining": "200000",
    };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 6, localLastDate: TODAY, localStreak: 6 });

    renderStreakPanel();

    expect(getDisplayedStreak()).toBe(1);
  });

  it("ignores zero and invalid formulas when deriving accounting days", () => {
    state.appState.entries = {
      "2_1_dining": "100000",
      "2_2_dining": "0",
      "2_2_income": "=1++2",
      "2_3_dining": "not-a-number",
      "2_3_income": "200000",
    };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 5, localLastDate: TODAY, localStreak: 5 });

    renderStreakPanel();

    expect(getDisplayedStreak()).toBe(1);
  });

  it("recomputes to 0 after direct table edit deletes today's only valid entry", async () => {
    document.body.innerHTML += [
      '<span id="ui-year-start"></span>',
      '<span id="ui-year-end"></span>',
      '<input id="delete-entry" class="cell-input" data-type="entry" data-key="2_3_dining">',
    ].join("");
    state.appState.entries = { "2_3_dining": "100000" };
    setLegacyStreak({ cloudLastDate: TODAY, cloudStreak: 1, localLastDate: TODAY, localStreak: 1 });
    renderStreakPanel();

    await import("../../src/js/main.js");
    const input = document.getElementById("delete-entry");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(getDisplayedStreak()).toBe(0);
  });

  it.each([7, 30])("triggers the %i day reward once without writing legacy streak counters", async (days) => {
    vi.setSystemTime(new Date("2026-03-31T05:00:00.000Z"));
    state.activeMonthId = 3;
    state.appState.entries = entriesForStreak(days);
    setLegacyStreak({ cloudLastDate: YESTERDAY, cloudStreak: days - 1, localLastDate: YESTERDAY, localStreak: days - 1 });

    updateStreakAfterRecord();
    updateStreakAfterRecord();
    await vi.dynamicImportSettled();

    const milestoneCalls = Fireworks.launch.mock.calls.filter(([opts]) => opts?.duration === 15000);
    expect(milestoneCalls).toHaveLength(1);
    expect(state.pendingUpdates.settings.expense_streak).toBeUndefined();
    expect(state.pendingUpdates.settings.expense_last_date).toBeUndefined();
  });

  it("extends the regular celebration duration by 25%", async () => {
    state.appState.entries = entriesForStreak(2);

    updateStreakAfterRecord();
    await vi.dynamicImportSettled();

    expect(Fireworks.launch).toHaveBeenCalledWith({ duration: 7500 });
  });

  it("derives Dec 31 to Jan 1 continuity from adjacent-year entries", () => {
    vi.setSystemTime(new Date("2026-01-01T05:00:00.000Z"));
    state.activeMonthId = 1;
    state.appState.entries = {
      "1_1_income": "100000",
    };
    state.previousYearEntries = {
      "12_31_dining": "200000",
    };
    setLegacyStreak({ cloudLastDate: "2025-12-31", cloudStreak: 9, localLastDate: "2025-12-31", localStreak: 9 });

    renderStreakPanel();

    expect(getDisplayedStreak()).toBe(2);
    expect(buildLegacyStreak(state.appState.entries, 2026, new Date(), "Asia/Ho_Chi_Minh", {
      previousYearEntries: state.previousYearEntries,
    }).streak).toBe(2);
  });
});
