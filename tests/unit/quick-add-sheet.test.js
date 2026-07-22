import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/sync.js", () => ({ triggerCloudSave: vi.fn() }));

const setupSheet = () => {
  document.body.innerHTML = [
    '<div id="quick-add-modal" aria-hidden="true"><div id="quick-add-panel" tabindex="-1"></div></div>',
    '<select id="qa-day"><option value="1" selected>1</option></select>',
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
});
