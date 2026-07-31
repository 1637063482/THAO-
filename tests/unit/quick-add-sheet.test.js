import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/sync.js", () => ({ triggerCloudSave: vi.fn() }));

const setupSheet = () => {
  document.body.innerHTML = [
    '<div id="quick-add-modal" aria-hidden="true"><div id="quick-add-panel" tabindex="-1"></div></div>',
    '<input type="hidden" id="qa-day" value="1">',
    '<select id="qa-cat"><option value="dining" selected>dining</option></select>',
    '<input id="qa-amount">',
    '<input id="qa-remark">',
  ].join("");
};

describe("quick-add bottom sheet", () => {
  beforeEach(() => {
    vi.resetModules();
    setupSheet();
  });

  it("opens as an accessible sheet and focuses the amount field", async () => {
    const { openQuickAdd } = await import("../../src/js/quick-add.js");
    openQuickAdd();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.getElementById("quick-add-modal").getAttribute("aria-hidden")).toBe("false");
    expect(document.getElementById("quick-add-modal").classList.contains("is-open")).toBe(true);
    expect(document.activeElement.id).toBe("qa-amount");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    document.body.insertAdjacentHTML("afterbegin", '<button id="fab-btn"></button>');
    const { openQuickAdd } = await import("../../src/js/quick-add.js");
    document.getElementById("fab-btn").focus();
    openQuickAdd();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(document.getElementById("quick-add-modal").getAttribute("aria-hidden")).toBe("true");
    expect(document.getElementById("fab-btn")).toBe(document.activeElement);
  });

  it("keeps entered amount and remark when saving fails", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const sync = await import("../../src/js/sync.js");
    document.getElementById("qa-amount").value = "50000";
    document.getElementById("qa-remark").value = "test note";
    sync.triggerCloudSave.mockImplementation(() => { throw new Error("offline"); });
    expect(() => quickAdd.submitQuickAdd()).toThrow("offline");
    expect(document.getElementById("qa-amount").value).toBe("50000");
    expect(document.getElementById("qa-remark").value).toBe("test note");
  });

  it("ignores a re-entrant duplicate submit while the first save is in flight", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const sync = await import("../../src/js/sync.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.appState.entries = {};
    stateModule.state.pendingUpdates = { entries: {} };
    document.getElementById("qa-amount").value = "50000";
    sync.triggerCloudSave.mockImplementation(() => { quickAdd.submitQuickAdd(); });
    quickAdd.submitQuickAdd();
    const key = stateModule.state.activeMonthId + "_1_dining";
    expect(stateModule.state.appState.entries[key]).toBe("=50000");
    expect(stateModule.state.pendingUpdates.entries[key]).toBe("=50000");
  });

  it("restores the submit control after success and on the next open", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const sync = await import("../../src/js/sync.js");
    const button = document.createElement("button");
    button.setAttribute("data-quick-add-submit", "");
    document.getElementById("quick-add-panel").appendChild(button);
    sync.triggerCloudSave.mockImplementation(() => {});
    document.getElementById("qa-amount").value = "50000";
    quickAdd.submitQuickAdd();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
    quickAdd.openQuickAdd();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });

  it.each(["1.5", "0", "-1"])("rejects non-positive or fractional VND amount %s", async (amount) => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.currentCurrency = "VND";
    document.getElementById("qa-amount").value = amount;
    expect(() => quickAdd.submitQuickAdd()).not.toThrow();
    expect(stateModule.state.appState.entries[stateModule.state.activeMonthId + "_1_dining"]).toBeUndefined();
    expect(document.getElementById("qa-amount").value).toBe(amount);
  });

  it("clears aria-busy after invalid VND validation", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const button = document.createElement("button");
    button.setAttribute("data-quick-add-submit", "");
    document.getElementById("quick-add-panel").appendChild(button);
    document.getElementById("qa-amount").value = "0";
    quickAdd.submitQuickAdd();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });
});
