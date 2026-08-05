/**
 * @typedef {Object} GlobalModalOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} dialog
 * @property {HTMLElement | null} [trigger]
 * @property {string} [focusSelector]
 * @property {number} [targetWidth]
 * @property {number} [closeDuration]
 * @property {() => void} [onClosed]
 */

/**
 * Reusable body-level modal motion used by command-like application surfaces.
 * The caller owns the portal markup and event bindings; this controller owns
 * the FLIP transition, ARIA state, scroll lock, and focus restoration.
 *
 * @param {GlobalModalOptions} options
 */
export function createGlobalModalController({
  root,
  dialog,
  trigger = null,
  focusSelector = "",
  targetWidth = 560,
  closeDuration = 1200,
  onClosed,
}) {
  const documentRef = root.ownerDocument;
  const windowRef = documentRef.defaultView;
  const body = documentRef.body;
  /** @type {number | null} */
  let flipFrame = null;
  /** @type {number | null} */
  let closeTimer = null;
  let sequence = 0;

  root.classList.add("app-global-modal");
  dialog.classList.add("app-global-modal-dialog");
  root.setAttribute("aria-hidden", "true");

  /** @param {(timestamp: number) => void} callback */
  function requestFrame(callback) {
    if (windowRef?.requestAnimationFrame) return windowRef.requestAnimationFrame(callback);
    return /** @type {number} */ (setTimeout(callback, 0));
  }

  /** @param {number | null} frame */
  function cancelFrame(frame) {
    if (frame === null || frame === undefined) return;
    if (windowRef?.cancelAnimationFrame) windowRef.cancelAnimationFrame(frame);
    else clearTimeout(frame);
  }

  function cancelFlip() {
    sequence += 1;
    cancelFrame(flipFrame);
    flipFrame = null;
  }

  function cancelClose() {
    if (closeTimer === null) return;
    if (windowRef?.clearTimeout) windowRef.clearTimeout(closeTimer);
    else clearTimeout(closeTimer);
    closeTimer = null;
  }

  function getTrigger() {
    if (trigger && typeof trigger.getBoundingClientRect === "function") return trigger;
    const active = documentRef.activeElement;
    return active && typeof active.getBoundingClientRect === "function" ? active : null;
  }

  function setFlipGeometry() {
    const viewportWidth = windowRef?.innerWidth || documentRef.documentElement.clientWidth || targetWidth;
    const viewportHeight = windowRef?.innerHeight || documentRef.documentElement.clientHeight || 768;
    const triggerElement = getTrigger();
    const triggerRect = triggerElement?.getBoundingClientRect();
    if (!triggerRect) return;
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    const scale = Math.max(Math.min(triggerRect.width / targetWidth, 0.5), 0.3);
    dialog.style.setProperty("--app-global-modal-flip-x", `${triggerCenterX - viewportWidth / 2}px`);
    dialog.style.setProperty("--app-global-modal-flip-y", `${triggerCenterY - viewportHeight / 2}px`);
    dialog.style.setProperty("--app-global-modal-flip-scale", String(scale));
  }

  function prepareOpening() {
    setFlipGeometry();
    dialog.style.setProperty("transition", "none");
    dialog.classList.add("app-global-modal-dialog--flip-start");
  }

  function playOpening() {
    const currentSequence = sequence;
    flipFrame = requestFrame(() => {
      flipFrame = requestFrame(() => {
        flipFrame = null;
        if (currentSequence !== sequence) return;
        dialog.style.removeProperty("transition");
        void dialog.offsetWidth;
        dialog.classList.remove("app-global-modal-dialog--flip-start");
      });
    });
  }

  function focusOnOpen() {
    const target = (focusSelector && dialog.querySelector(focusSelector))
      || dialog.querySelector("input, select, textarea, button, [tabindex]:not([tabindex='-1'])")
      || dialog;
    if (!(target instanceof HTMLElement)) return;
    try { target.focus({ preventScroll: true }); }
    catch { target.focus(); }
  }

  function restoreFocus() {
    const target = getTrigger();
    if (!(target instanceof HTMLElement) || typeof target.focus !== "function") return;
    try { target.focus({ preventScroll: true }); }
    catch { target.focus(); }
  }

  function finishClose() {
    closeTimer = null;
    dialog.classList.remove("app-global-modal-dialog--flip-close");
    dialog.style.removeProperty("transition");
    root.classList.remove("closing");
    root.style.removeProperty("transition");
    onClosed?.();
  }

  function open() {
    cancelFlip();
    cancelClose();
    root.classList.remove("closing");
    dialog.classList.remove("app-global-modal-dialog--flip-close");
    dialog.style.removeProperty("transition");
    root.style.removeProperty("transition");
    prepareOpening();
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    body.classList.add("app-modal-open");
    playOpening();
    focusOnOpen();
  }

  function close() {
    cancelFlip();
    cancelClose();
    if (!root.classList.contains("open")) return;
    dialog.classList.remove("app-global-modal-dialog--flip-start");
    dialog.style.removeProperty("transition");
    setFlipGeometry();
    dialog.style.setProperty("transition", `transform ${closeDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`);
    dialog.classList.add("app-global-modal-dialog--flip-close");
    root.style.setProperty("transition", `opacity ${closeDuration}ms ease-out`);
    root.classList.remove("open");
    root.classList.add("closing");
    root.setAttribute("aria-hidden", "true");
    body.classList.remove("app-modal-open");
    restoreFocus();
    if (windowRef) closeTimer = windowRef.setTimeout(finishClose, closeDuration);
    else closeTimer = /** @type {number} */ (/** @type {unknown} */ (setTimeout(finishClose, closeDuration)));
  }

  function destroy() {
    cancelFlip();
    cancelClose();
    dialog.classList.remove("app-global-modal-dialog--flip-start", "app-global-modal-dialog--flip-close");
    dialog.style.removeProperty("transition");
    root.classList.remove("open", "closing");
    root.style.removeProperty("transition");
    root.setAttribute("aria-hidden", "true");
    body.classList.remove("app-modal-open");
  }

  return {
    open,
    close,
    destroy,
    isOpen: () => root.classList.contains("open"),
  };
}
