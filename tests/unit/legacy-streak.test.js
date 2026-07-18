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
import { renderStreakPanel } from "../../src/js/render.js";
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
  const match = text.match(/(\d+)\s*天/);
  return match ? Number(match[1]) : NaN;
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

    expect(getDisplayedStreak()).toBe(2);
  });

  it("uses the same rule after quick add creates the second consecutive accounting day", () => {
    document.body.innerHTML += [
      '<div id="quick-add-modal" style="display:flex"></div>',
      '<div id="quick-add-panel"></div>',
      '<select id="qa-day"><option value="3" selected>2/3</option></select>',
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
      '<select id="qa-day"><option value="2" selected>2/2</option></select>',
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
});
