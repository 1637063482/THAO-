import { describe, expect, it } from "vitest";
import { requestAppConfirmation } from "../../src/components/feedback/confirmation-dialog.js";
import { setLocale } from "../../src/js/i18n.js";

describe("application confirmation dialog", () => {
  it("renders an accessible destructive dialog and resolves the explicit choice", async () => {
    const result = requestAppConfirmation({ title: "Delete", message: "Remove this item?", destructive: true });
    const dialog = document.querySelector("[role=alertdialog]");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.textContent).toContain("Remove this item?");
    expect(dialog?.querySelector("[data-confirm-accept]")?.className).toBe("btn-danger");
    /** @type {HTMLButtonElement} */ (dialog?.querySelector("[data-confirm-cancel]")).click();
    await expect(result).resolves.toBe(false);
    expect(document.querySelector("[role=alertdialog]")).toBeNull();
  });

  it("closes with Escape and returns focus to the opener", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const result = requestAppConfirmation({ message: "Continue?" });
    const dialog = /** @type {HTMLElement} */ (document.querySelector("[role=alertdialog]"));
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(result).resolves.toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it.each([
    ["vi", "Xác nhận", "Xác nhận", "Hủy"],
    ["zh-CN", "确认", "确认", "取消"],
  ])("uses locale-owned default labels for %s", async (locale, title, confirmLabel, cancelLabel) => {
    setLocale(locale);
    const result = requestAppConfirmation({ message: "Continue?" });
    const dialog = document.querySelector("[role=alertdialog]");

    expect(dialog.querySelector("#app-confirmation-title").textContent).toBe(title);
    expect(dialog.querySelector("[data-confirm-accept]").textContent).toBe(confirmLabel);
    expect(dialog.querySelector("[data-confirm-cancel]").textContent).toBe(cancelLabel);
    dialog.querySelector("[data-confirm-cancel]").click();
    await expect(result).resolves.toBe(false);
  });

  it("returns to the default locale after localized assertions", () => {
    setLocale("vi");
    expect(document.documentElement.lang).toBe("vi");
  });
});
