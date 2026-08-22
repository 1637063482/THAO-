import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLedgerInputController } from "../../src/features/ledger/input-controller.js";

function createHarness() {
  document.body.innerHTML = '<input id="entry" class="cell-input" data-type="entry" data-key="7_27_dining">';
  const state = {
    currentCurrency: "VND",
    currentUser: { uid: "fixture-user" },
    appState: { balances: {}, entries: {}, settings: {} },
    pendingUpdates: { balances: {}, entries: {}, settings: {} },
  };
  const dependencies = {
    state,
    root: document.body,
    windowRoot: window,
    getActiveRate: () => 3_500,
    isValidCurrencyRate: () => true,
    parseCurrencyInputToVnd: vi.fn(value => value),
    formatVndForCurrencyInput: vi.fn(value => value),
    formatDisplay: vi.fn(value => String(value)),
    evaluate: vi.fn(value => Number(value || 0)),
    updateActivity: vi.fn(),
    triggerSave: vi.fn(),
    refreshCalculatedViews: vi.fn(),
    refreshDashboard: vi.fn(),
    updateStreak: vi.fn(),
    showFxUnavailable: vi.fn(),
    isOnline: () => false,
    hasPendingChanges: () => Object.keys(state.pendingUpdates.entries).length > 0,
    getUnsavedWarning: vi.fn(() => "unsaved"),
    setTimer: vi.fn(callback => {
      callback();
      return 17;
    }),
    clearTimer: vi.fn(),
  };
  return {
    controller: createLedgerInputController(dependencies),
    dependencies,
    input: document.getElementById("entry"),
    state,
  };
}

describe("ledger input controller", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("updates the legacy entries matrix on input and persists with streak refresh on focusout", () => {
    const { controller, dependencies, input, state } = createHarness();
    controller.start();

    input.value = "250000";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(state.appState.entries["7_27_dining"]).toBe("250000");
    expect(state.pendingUpdates.entries["7_27_dining"]).toBe("250000");
    expect(dependencies.triggerSave).toHaveBeenCalledOnce();
    expect(dependencies.updateStreak).not.toHaveBeenCalled();

    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(dependencies.updateStreak).toHaveBeenCalledOnce();
    expect(input.dataset.raw).toBe("250000");
  });

  it("does not mutate pending VND while CNY is only being viewed", () => {
    const { controller, dependencies, input, state } = createHarness();
    state.currentCurrency = "CNY";
    state.appState.entries["7_27_dining"] = "250000";
    state.pendingUpdates.entries["7_27_dining"] = "250000";
    input.dataset.raw = "250000";
    controller.start();

    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(state.appState.entries["7_27_dining"]).toBe("250000");
    expect(state.pendingUpdates.entries["7_27_dining"]).toBe("250000");
    expect(dependencies.triggerSave).not.toHaveBeenCalled();
  });

  it.each(["-1", "1.5", "1e6", "100+"]) ("does not persist an invalid direct ledger amount %s", (value) => {
    const { controller, dependencies, input, state } = createHarness();
    controller.start();

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(state.appState.entries).toEqual({});
    expect(state.pendingUpdates.entries).toEqual({});
    expect(dependencies.triggerSave).not.toHaveBeenCalled();
  });

  it("does not persist an invalid direct balance amount", () => {
    const { controller, dependencies, input, state } = createHarness();
    input.id = "balance-bank";
    input.dataset.type = "balance";
    input.dataset.key = "bank";
    controller.start();

    input.value = "-1";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(state.appState.balances).toEqual({});
    expect(state.pendingUpdates.balances).toEqual({});
    expect(dependencies.triggerSave).not.toHaveBeenCalled();
  });

  it("removes delegated input resources on stop", () => {
    const { controller, dependencies, input, state } = createHarness();
    controller.start();
    controller.stop();

    input.value = "300000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(state.appState.entries).toEqual({});
    expect(dependencies.triggerSave).not.toHaveBeenCalled();
    expect(dependencies.updateStreak).not.toHaveBeenCalled();
  });

  it("protects offline pending changes from beforeunload", () => {
    const { controller, dependencies, state } = createHarness();
    state.pendingUpdates.entries.pending = "100";
    state.isSaving = false;
    controller.start();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dependencies.getUnsavedWarning).toHaveBeenCalledOnce();
  });
});
