import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLedgerController } from "../../src/features/ledger/controller.js";

function createHarness() {
  document.body.innerHTML = [
    '<button id="btn-tab-2" data-ledger-month="2"></button>',
    '<button id="btn-tab-3" data-ledger-month="3"></button>',
    '<span id="monthly-chart-title"></span>',
    '<span id="budget-label-month"></span>',
  ].join("");
  const state = { activeYear: 2026, activeMonthId: 2 };
  const inputController = { start: vi.fn(), stop: vi.fn() };
  const yearController = {
    start: vi.fn(),
    stop: vi.fn(),
    changeYear: vi.fn(),
    refreshLabels: vi.fn(),
  };
  const today = { current: { year: 2026, month: 2, day: 28, dateKey: "2026-02-28" } };
  const dependencies = {
    state,
    documentRoot: document,
    windowRoot: window,
    inputController,
    yearController,
    sync: { start: vi.fn(), stop: vi.fn() },
    clock: {
      getToday: () => today.current,
      getNextMidnightDelay: () => 1_000,
    },
    renderLedger: vi.fn(),
    softRenderLedger: vi.fn(),
    renderStreak: vi.fn(),
    updateStreakFromSnapshot: vi.fn(),
    refreshDashboardForMonth: vi.fn(),
    refreshDashboard: vi.fn(),
    refreshSavings: vi.fn(),
    scheduleIcons: vi.fn(),
    notifyDomRebuilt: vi.fn(),
    translate: (key, values = {}) => `${key}:${values.month ?? ""}`,
    setTimer: vi.fn(() => 51),
    clearTimer: vi.fn(),
  };
  return {
    controller: createLedgerController(dependencies),
    dependencies,
    state,
    today,
  };
}

describe("legacy ledger controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("refreshes ledger, dashboard, and savings together when the month changes", () => {
    const { controller, dependencies, state } = createHarness();
    controller.mount();

    document.getElementById("btn-tab-3").click();

    expect(state.activeMonthId).toBe(3);
    expect(dependencies.renderLedger).toHaveBeenCalledOnce();
    expect(dependencies.refreshDashboardForMonth).toHaveBeenCalledOnce();
    expect(dependencies.refreshSavings).toHaveBeenCalledOnce();
    expect(document.getElementById("btn-tab-3").className).toContain("active");
  });

  it("moves today at Vietnam midnight without a reload", () => {
    const { controller, dependencies, state, today } = createHarness();
    controller.mount();
    today.current = { year: 2026, month: 3, day: 1, dateKey: "2026-03-01" };

    controller.refreshForDateChange();

    expect(state.activeMonthId).toBe(3);
    expect(dependencies.renderLedger).toHaveBeenCalledOnce();
    expect(dependencies.renderStreak).toHaveBeenCalledOnce();
  });

  it("switches the ledger year at Vietnam New Year and retries when saving blocks the change", () => {
    const { controller, dependencies, state, today } = createHarness();
    state.activeYear = 2026;
    state.activeMonthId = 2;
    today.current = { year: 2026, month: 2, day: 28, dateKey: "2026-02-28" };
    controller.mount();
    dependencies.yearController.changeYear.mockReturnValueOnce(false).mockReturnValueOnce(true);
    today.current = { year: 2027, month: 1, day: 1, dateKey: "2027-01-01" };

    expect(controller.refreshForDateChange()).toBe(false);
    expect(controller.refreshForDateChange()).toBe(true);

    expect(dependencies.yearController.changeYear).toHaveBeenCalledTimes(2);
    expect(dependencies.yearController.changeYear).toHaveBeenCalledWith(2027);
    expect(dependencies.renderStreak).toHaveBeenCalledOnce();
  });

  it("routes remote snapshots through soft rendering and the non-default streak path", () => {
    const { controller, dependencies } = createHarness();
    controller.start();
    const callbacks = dependencies.sync.start.mock.calls[0][0];

    callbacks.onSnapshotApplied();
    callbacks.onStreakRefresh();

    expect(dependencies.softRenderLedger).toHaveBeenCalledOnce();
    expect(dependencies.refreshDashboard).toHaveBeenCalledOnce();
    expect(dependencies.refreshSavings).toHaveBeenCalledTimes(2);
    expect(dependencies.updateStreakFromSnapshot).toHaveBeenCalledWith({ launchDefaultFireworks: false });
    expect(dependencies.renderStreak).toHaveBeenCalledOnce();
  });

  it("cleans input, year, sync, listeners, and midnight timer on stop", () => {
    const { controller, dependencies } = createHarness();
    controller.start();

    controller.stop();

    expect(dependencies.inputController.stop).toHaveBeenCalledOnce();
    expect(dependencies.yearController.stop).toHaveBeenCalledOnce();
    expect(dependencies.sync.stop).toHaveBeenCalled();
    expect(dependencies.clearTimer).toHaveBeenCalledWith(51);
  });
});
