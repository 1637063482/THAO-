import { describe, expect, it, vi } from "vitest";
import { requestAppConfirmation } from "../../src/components/feedback/confirmation-dialog.js";
import { createGlobalModalController } from "../../src/components/feedback/global-modal.js";
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
      vi.advanceTimersByTime(800);
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
      expect(dialog.style.getPropertyValue("transition")).toBe("transform 800ms cubic-bezier(0.4, 0, 0.6, 1)");
      expect(host.style.getPropertyValue("transition")).toBe("opacity 160ms ease-in 640ms");
      expect(document.body.contains(host)).toBe(true);
      vi.advanceTimersByTime(799);
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

  it("cleans up only after the panel and backdrop animations finish", async () => {
    vi.useFakeTimers();
    const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    const animations = [];
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: (keyframes, options) => {
        let resolveFinished;
        const animation = {
          cancel: vi.fn(),
          finished: new Promise(resolve => { resolveFinished = resolve; }),
          finish: () => resolveFinished(),
        };
        animations.push({ animation, keyframes, options });
        return animation;
      },
    });

    try {
      const result = requestAppConfirmation({ message: "Continue?" });
      vi.runAllTimers();
      const dialog = /** @type {HTMLElement} */ (document.querySelector("[role=alertdialog]"));
      const host = dialog.parentElement;
      const openingBackdropAnimations = animations.filter(({ options }) => options.duration === 320);
      expect(openingBackdropAnimations).toHaveLength(1);
      expect(openingBackdropAnimations[0].keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
      dialog.querySelector("[data-confirm-cancel]").click();

      const closeAnimations = animations.filter(({ options }) => options.duration === 800);
      expect(closeAnimations).toHaveLength(2);
      expect(document.body.contains(host)).toBe(true);

      closeAnimations[0].animation.finish();
      await Promise.resolve();
      expect(document.body.contains(host)).toBe(true);

      closeAnimations[1].animation.finish();
      await Promise.resolve();
      await expect(result).resolves.toBe(false);
      expect(document.body.contains(host)).toBe(false);
    } finally {
      if (originalDescriptor) Object.defineProperty(Element.prototype, "animate", originalDescriptor);
      else delete Element.prototype.animate;
      vi.runAllTimers();
      vi.useRealTimers();
    }
  });

  it("reverses a closing modal from its current visual frame without resetting the backdrop", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    const animations = [];
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: (keyframes, options) => {
        const animation = {
          cancel: vi.fn(),
          finished: new Promise(() => {}),
        };
        animations.push({ animation, keyframes, options });
        return animation;
      },
    });

    const host = document.createElement("div");
    const dialog = document.createElement("section");
    const trigger = document.createElement("button");
    host.append(dialog);
    document.body.append(trigger, host);
    let interrupted = false;
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    const getComputedStyleSpy = vi.spyOn(window, "getComputedStyle").mockImplementation(element => {
      if (interrupted && element === dialog) {
        return /** @type {CSSStyleDeclaration} */ ({
          transform: "matrix(1, 0, 0, 1, -24, 18)",
          opacity: "0.68",
        });
      }
      if (interrupted && element === host) {
        return /** @type {CSSStyleDeclaration} */ ({ transform: "none", opacity: "0.64" });
      }
      return originalGetComputedStyle(element);
    });
    const controller = createGlobalModalController({
      root: host,
      dialog,
      trigger,
      targetWidth: 560,
      closeDuration: 800,
    });

    try {
      controller.open();
      interrupted = true;
      controller.close();
      controller.open();

      const openingDialogAnimations = animations.filter(({ options }) => options.duration === 1080);
      const openingBackdropAnimations = animations.filter(({ options }) => options.duration === 320);
      expect(openingDialogAnimations).toHaveLength(2);
      expect(openingBackdropAnimations).toHaveLength(2);
      expect(openingDialogAnimations[1].keyframes[0]).toEqual({
        transform: "matrix(1, 0, 0, 1, -24, 18)",
        opacity: "0.68",
      });
      expect(openingBackdropAnimations[1].keyframes[0]).toEqual({ opacity: "0.64" });
    } finally {
      controller.destroy();
      getComputedStyleSpy.mockRestore();
      if (originalDescriptor) Object.defineProperty(Element.prototype, "animate", originalDescriptor);
      else delete Element.prototype.animate;
      host.remove();
      trigger.remove();
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
