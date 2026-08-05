import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderAppDropdown, setAppDropdownValue } from "../../src/components/feedback/app-dropdown.js";

vi.mock("../../src/js/sync.js", () => ({ triggerCloudSave: vi.fn() }));

const setupSheet = () => {
  document.body.innerHTML = [
    '<div id="quick-add-modal" aria-hidden="true"><div id="quick-add-panel" tabindex="-1">',
    renderAppDropdown({ id: "qa-day", value: "1", options: [{ value: "1", label: "1", selected: true }] }),
    renderAppDropdown({ id: "qa-cat", value: "dining", options: [{ value: "dining", label: "dining", selected: true }] }),
    '<input id="qa-amount">',
    '<input id="qa-remark">',
    '</div></div>',
    '<div id="toast"><span id="toast-icon"></span><span id="toast-msg"></span></div>',
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

  it("opens as a body-level centered FLIP modal and locks page scrolling", async () => {
    document.body.insertAdjacentHTML("afterbegin", '<button id="fab-btn"></button>');
    const { openQuickAdd } = await import("../../src/js/quick-add.js");
    const trigger = document.getElementById("fab-btn");
    trigger.getBoundingClientRect = () => ({ left: 100, top: 20, width: 56, height: 56 });
    trigger.focus();

    openQuickAdd();

    const modal = document.getElementById("quick-add-modal");
    const panel = document.getElementById("quick-add-panel");
    expect(modal.parentElement).toBe(document.body);
    expect(modal.classList.contains("app-global-modal")).toBe(true);
    expect(panel.classList.contains("app-global-modal-dialog")).toBe(true);
    expect(panel.classList.contains("app-global-modal-dialog--flip-start")).toBe(true);
    expect(document.body.classList.contains("app-modal-open")).toBe(true);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    document.body.insertAdjacentHTML("afterbegin", '<button id="fab-btn"></button>');
    const { openQuickAdd } = await import("../../src/js/quick-add.js");
    document.getElementById("fab-btn").focus();
    openQuickAdd();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    const modal = document.getElementById("quick-add-modal");
    expect(modal.getAttribute("aria-hidden")).toBe("true");
    expect(modal.classList.contains("closing")).toBe(true);
    expect(document.body.classList.contains("app-modal-open")).toBe(false);
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

  it("formats the quick-add amount with thousands separators while typing", async () => {
    await import("../../src/js/quick-add.js");
    const amount = document.getElementById("qa-amount");

    amount.value = "1234567";
    amount.dispatchEvent(new Event("input", { bubbles: true }));

    expect(amount.type).toBe("text");
    expect(amount.value).toBe("1,234,567");
  });

  it("submits a formatted quick-add amount as the original numeric VND value", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const sync = await import("../../src/js/sync.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.currentCurrency = "VND";
    stateModule.state.appState.entries = {};
    stateModule.state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
    sync.triggerCloudSave.mockImplementation(() => {});
    document.getElementById("qa-amount").value = "1,234,567";

    quickAdd.submitQuickAdd();

    const key = stateModule.state.activeMonthId + "_1_dining";
    expect(stateModule.state.appState.entries[key]).toBe("=1234567");
  });

  it("formats CNY quick-add amounts with separators and decimal precision", async () => {
    await import("../../src/js/quick-add.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.currentCurrency = "CNY";
    const amount = document.getElementById("qa-amount");

    amount.value = "1234567.89";
    amount.dispatchEvent(new Event("input", { bubbles: true }));

    expect(amount.value).toBe("1,234,567.89");
  });

  it("does not turn a fractional VND amount into a different valid integer", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.currentCurrency = "VND";
    stateModule.state.appState.entries = {};
    const amount = document.getElementById("qa-amount");

    amount.value = "1.5";
    amount.dispatchEvent(new Event("input", { bubbles: true }));
    quickAdd.submitQuickAdd();

    expect(amount.value).toBe("1.5");
    expect(stateModule.state.appState.entries[stateModule.state.activeMonthId + "_1_dining"]).toBeUndefined();
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

  it("selects a valid day when the active month is not the current month", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const stateModule = await import("../../src/js/state.js");
    const today = new Date();
    const originalMonth = stateModule.state.activeMonthId;
    const originalYear = stateModule.state.activeYear;
    const nonCurrentMonth = today.getUTCMonth() + 1 === 12 ? 1 : today.getUTCMonth() + 2;
    stateModule.state.activeYear = today.getUTCFullYear();
    stateModule.state.activeMonthId = nonCurrentMonth;

    quickAdd.openQuickAdd();

    const day = document.querySelector("#qa-day [data-app-dropdown-hidden]").value;
    expect(day).toMatch(/^\d+$/);
    expect(Number(day)).toBeGreaterThanOrEqual(1);
    expect(Number(day)).toBeLessThanOrEqual(new Date(stateModule.state.activeYear, nonCurrentMonth, 0).getDate());

    stateModule.state.activeMonthId = originalMonth;
    stateModule.state.activeYear = originalYear;
  });

  it("rejects empty date or category before writing ledger entries", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const stateModule = await import("../../src/js/state.js");
    stateModule.state.appState.entries = {};
    stateModule.state.pendingUpdates = { entries: {} };
    setAppDropdownValue(document.getElementById("qa-day"), "");
    setAppDropdownValue(document.getElementById("qa-cat"), "");
    document.getElementById("qa-amount").value = "1000";

    quickAdd.submitQuickAdd();

    expect(stateModule.state.appState.entries).toEqual({});
    expect(stateModule.state.pendingUpdates.entries).toEqual({});
    expect(document.getElementById("toast-msg").innerText).toContain("Vui lòng chọn ngày");
  });

  it("refreshes existing date and category labels after vi to zh-CN to vi", async () => {
    const quickAdd = await import("../../src/js/quick-add.js");
    const { setLocale } = await import("../../src/js/i18n.js");
    quickAdd.openQuickAdd();

    setLocale("zh-CN");
    const labelsAfterZh = () => [...document.querySelectorAll("[data-app-dropdown-option]")].map(option => option.textContent);
    expect(labelsAfterZh().some(label => label.includes("餐饮饮食"))).toBe(true);
    expect(labelsAfterZh().some(label => label.includes("月"))).toBe(true);

    setLocale("vi");
    const labelsAfterVi = () => [...document.querySelectorAll("[data-app-dropdown-option]")].map(option => option.textContent);
    expect(labelsAfterVi().some(label => label.includes("Ăn uống"))).toBe(true);
    expect(labelsAfterVi().some(label => label.includes("Tháng"))).toBe(true);
  });
});
