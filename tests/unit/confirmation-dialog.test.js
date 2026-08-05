import { describe, expect, it, vi } from "vitest";
import { requestAppConfirmation } from "../../src/components/feedback/confirmation-dialog.js";
import { setLocale } from "../../src/js/i18n.js";

describe("application confirmation dialog", () => {
  it("renders an accessible destructive dialog and resolves the explicit choice", async () => {
    vi.useFakeTimers();
    try {
      const result = requestAppConfirmation({ title: "Delete", message: "Remove this item?", destructive: true });
      const dialog = document.querySelector("[role=alertdialog]");
      expect(dialog?.getAttribute("aria-modal")).toBe("true");
      expect(dialog?.textContent).toContain("Remove this item?");
      expect(dialog?.querySelector("[data-confirm-accept]")?.className).toBe("btn-danger");
      /** @type {HTMLButtonElement} */ (dialog?.querySelector("[data-confirm-cancel]")).click();
      await expect(result).resolves.toBe(false);
      vi.advanceTimersByTime(1200);
      expect(document.querySelector("[role=alertdialog]")).toBeNull();
    } finally {
      vi.runAllTimers();
      vi.useRealTimers();
    }
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

  it("uses the shared FLIP modal and keeps the backdrop during its close motion", async () => {
    vi.useFakeTimers();
    try {
      const result = requestAppConfirmation({ message: "Continue?" });
      const dialog = /** @type {HTMLElement} */ (document.querySelector("[role=alertdialog]"));
      const host = dialog.parentElement;
      expect(host.classList.contains("app-global-modal")).toBe(true);
      expect(dialog.classList.contains("app-global-modal-dialog")).toBe(true);

      dialog.querySelector("[data-confirm-cancel]").click();
      expect(host.classList.contains("closing")).toBe(true);
      expect(document.body.contains(host)).toBe(true);
      vi.advanceTimersByTime(1199);
      expect(document.body.contains(host)).toBe(true);
      vi.advanceTimersByTime(1);
      await expect(result).resolves.toBe(false);
      expect(document.body.contains(host)).toBe(false);
    } finally {
      document.querySelector("[data-confirm-cancel]")?.click();
      vi.runAllTimers();
      vi.useRealTimers();
    }
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
