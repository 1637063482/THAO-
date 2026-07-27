import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

describe("savings controller boundary", () => {
  it("keeps savings calculation and DOM rendering out of the composition root", () => {
    const main = readFileSync("src/js/main.js", "utf8");

    expect(main).toContain('createSavingsController');
    expect(main).toContain("savingsController.update()");
    expect(main).not.toContain("function refreshSavingsView");
    expect(main).not.toContain("buildSavingsViewModel");
    expect(main).not.toContain("renderSavingsPage");
  });

  it("renders initial, month, and remote state through injected dependencies", async () => {
    document.body.innerHTML = '<div id="sync-status"></div><div id="savings-root"></div>';
    const { createSavingsController } = await import("../../src/features/savings/controller.js");
    const state = { settings: { savings_goal_month_3: 300000 }, pendingUpdates: {}, month: 3 };
    const dashboard = vi.fn((month) => ({ totalIncome: month * 100000, totalSpending: month * 20000 }));
    const controller = createSavingsController({ root: document.getElementById("savings-root"), getSavingsState: () => state, getLocale: () => "vi", getDashboardViewModel: dashboard, triggerCloudSave: vi.fn() });

    controller.start();
    expect(dashboard).toHaveBeenCalledTimes(13);
    expect(document.querySelector('[name="monthly"]').value).toBe("300000");

    state.month = 4;
    state.settings.savings_goal_month_4 = 400000;
    controller.update();
    expect(document.querySelector('[name="monthly"]').value).toBe("400000");

    state.settings.savings_goal_month_4 = 500000;
    controller.update();
    expect(document.querySelector('[name="monthly"]').value).toBe("500000");
  });

  it("stops the sync observer and goal-form event listeners", async () => {
    document.body.innerHTML = '<div id="sync-status"></div><div id="savings-root"></div>';
    const { createSavingsController } = await import("../../src/features/savings/controller.js");
    const OriginalObserver = globalThis.MutationObserver;
    const disconnect = vi.fn();
    globalThis.MutationObserver = class { observe() {} disconnect() { disconnect(); } };
    const state = { settings: {}, pendingUpdates: {}, month: 3 };
    const save = vi.fn();
    const controller = createSavingsController({ root: document.getElementById("savings-root"), getSavingsState: () => state, getDashboardViewModel: () => ({ totalIncome: 0, totalSpending: 0 }), triggerCloudSave: save });

    controller.start();
    controller.stop();
    document.querySelector('[name="monthly"]').value = "500000";
    document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(disconnect).toHaveBeenCalledOnce();
    expect(state.pendingUpdates).toEqual({});
    expect(save).not.toHaveBeenCalled();
    globalThis.MutationObserver = OriginalObserver;
  });
});
