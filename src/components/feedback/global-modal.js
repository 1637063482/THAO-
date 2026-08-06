const openDuration = 1080;
const openBackdropDuration = 320;
const openEasing = "cubic-bezier(.22, 1, .36, 1)";
const closeEasing = "cubic-bezier(0.4, 0, 0.6, 1)";
const backdropHoldOffset = 0.7;

/**
 * @typedef {Object} GlobalModalMotionOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} dialog
 * @property {HTMLElement | null} trigger
 * @property {number} targetWidth
 * @property {string} flipX
 * @property {string} flipY
 * @property {string} flipScale
 * @property {string} flipStartClass
 * @property {string} flipCloseClass
 * @property {number} closeDuration
 * @property {() => void} [onCloseComplete]
 */

/**
 * Coordinates a trigger-origin FLIP animation for a body-level modal.
 * Web Animations API is the primary path; the CSS transition fallback keeps
 * the component usable in older runtimes and jsdom-based unit tests.
 *
 * @param {GlobalModalMotionOptions} options
 */
export function createGlobalModalMotion({
  root,
  dialog,
  trigger,
  targetWidth,
  flipX,
  flipY,
  flipScale,
  flipStartClass,
  flipCloseClass,
  closeDuration,
  onCloseComplete,
}) {
  const documentRef = root.ownerDocument;
  const windowRef = documentRef.defaultView;
  /** @type {number | null} */
  let flipFrame = null;
  /** @type {number | null} */
  let fallbackCloseTimer = null;
  /** @type {Animation | null} */
  let openingAnimation = null;
  /** @type {Animation | null} */
  let openingBackdropAnimation = null;
  /** @type {Animation | null} */
  let closingDialogAnimation = null;
  /** @type {Animation | null} */
  let closingBackdropAnimation = null;
  let sequence = 0;

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

  /** @param {Animation | null} animation */
  function cancelAnimation(animation) {
    if (!animation) return;
    try { animation.cancel(); } catch { /* An already-finished animation is safe to ignore. */ }
  }

  function cancelFallbackClose() {
    if (fallbackCloseTimer === null) return;
    if (windowRef?.clearTimeout) windowRef.clearTimeout(fallbackCloseTimer);
    else clearTimeout(fallbackCloseTimer);
    fallbackCloseTimer = null;
  }

  function cancel() {
    sequence += 1;
    cancelFrame(flipFrame);
    flipFrame = null;
    cancelFallbackClose();
    cancelAnimation(openingAnimation);
    cancelAnimation(openingBackdropAnimation);
    cancelAnimation(closingDialogAnimation);
    cancelAnimation(closingBackdropAnimation);
    openingAnimation = null;
    openingBackdropAnimation = null;
    closingDialogAnimation = null;
    closingBackdropAnimation = null;
  }

  function supportsWebAnimations() {
    return typeof dialog.animate === "function" && typeof root.animate === "function";
  }

  /** @param {number} duration */
  function getMotionDuration(duration) {
    return windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 1 : duration;
  }

  /** @param {Animation} animation */
  function finished(animation) {
    try {
      return Promise.resolve(animation.finished).catch(() => undefined);
    } catch {
      return Promise.resolve();
    }
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
    dialog.style.setProperty(flipX, `${triggerCenterX - viewportWidth / 2}px`);
    dialog.style.setProperty(flipY, `${triggerCenterY - viewportHeight / 2}px`);
    dialog.style.setProperty(flipScale, String(scale));
  }

  function getFlipTransform() {
    const x = dialog.style.getPropertyValue(flipX) || "0px";
    const y = dialog.style.getPropertyValue(flipY) || "0px";
    const scale = dialog.style.getPropertyValue(flipScale) || "1";
    return `translate(${x}, ${y}) scale(${scale})`;
  }

  function getCurrentDialogStyle() {
    const computed = windowRef?.getComputedStyle?.(dialog);
    const transform = computed?.transform && computed.transform !== "none"
      ? computed.transform
      : "translate(0, 0) scale(1)";
    const opacity = computed?.opacity || "1";
    return { transform, opacity };
  }

  function clearDialogMotion() {
    dialog.classList.remove(flipStartClass, flipCloseClass);
    dialog.style.removeProperty("transition");
    dialog.style.removeProperty("transform");
    dialog.style.removeProperty("opacity");
  }

  function prepareOpen() {
    cancel();
    setFlipGeometry();
    clearDialogMotion();
    root.style.removeProperty("opacity");
    root.style.setProperty("transition", supportsWebAnimations() ? "none" : `opacity ${openBackdropDuration}ms ease-out`);
    dialog.style.setProperty("transition", "none");
    dialog.classList.add(flipStartClass);
  }

  function playOpen() {
    const currentSequence = sequence;
    if (!supportsWebAnimations()) {
      flipFrame = requestFrame(() => {
        flipFrame = requestFrame(() => {
          flipFrame = null;
          if (currentSequence !== sequence) return;
          dialog.style.removeProperty("transition");
          void dialog.offsetWidth;
          dialog.classList.remove(flipStartClass);
        });
      });
      return;
    }

    const animation = dialog.animate([
      { transform: getFlipTransform(), opacity: 0 },
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
    ], {
      duration: getMotionDuration(openDuration),
      easing: openEasing,
      fill: "both",
    });
    const backdropAnimation = root.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], {
      duration: getMotionDuration(openBackdropDuration),
      easing: "ease-out",
      fill: "both",
    });
    openingAnimation = animation;
    openingBackdropAnimation = backdropAnimation;
    void finished(animation).then(() => {
      if (currentSequence !== sequence || openingAnimation !== animation) return;
      openingAnimation = null;
      cancelAnimation(animation);
      dialog.classList.remove(flipStartClass);
      dialog.style.removeProperty("transition");
    });
    void finished(backdropAnimation).then(() => {
      if (currentSequence !== sequence || openingBackdropAnimation !== backdropAnimation) return;
      openingBackdropAnimation = null;
      cancelAnimation(backdropAnimation);
      root.style.removeProperty("transition");
    });
  }

  function startClose() {
    const currentStyle = getCurrentDialogStyle();
    cancel();
    const currentSequence = sequence;
    dialog.classList.remove(flipStartClass);
    dialog.style.removeProperty("transition");
    setFlipGeometry();
    const targetTransform = getFlipTransform();
    const duration = getMotionDuration(closeDuration);
    const backdropDuration = Math.min(160, duration);
    const backdropDelay = Math.max(duration - backdropDuration, 0);

    if (!supportsWebAnimations()) {
      dialog.style.removeProperty("transform");
      dialog.style.removeProperty("opacity");
      dialog.style.setProperty("transition", `transform ${duration}ms ${closeEasing}`);
      dialog.classList.add(flipCloseClass);
      root.style.setProperty("transition", `opacity ${backdropDuration}ms ease-in ${backdropDelay}ms`);
      fallbackCloseTimer = /** @type {number} */ ((windowRef?.setTimeout || window.setTimeout)(() => {
        fallbackCloseTimer = null;
        clearDialogMotion();
        root.style.removeProperty("transition");
        onCloseComplete?.();
      }, duration));
      return;
    }

    dialog.classList.add(flipCloseClass);
    const dialogAnimation = dialog.animate([
      { transform: currentStyle.transform, opacity: currentStyle.opacity },
      { transform: targetTransform, opacity: 0 },
    ], {
      duration,
      easing: closeEasing,
      fill: "both",
    });
    const backdropAnimation = root.animate([
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: backdropHoldOffset },
      { opacity: 0, offset: 1 },
    ], {
      duration,
      easing: "linear",
      fill: "both",
    });
    closingDialogAnimation = dialogAnimation;
    closingBackdropAnimation = backdropAnimation;
    void Promise.all([finished(dialogAnimation), finished(backdropAnimation)]).then(() => {
      if (currentSequence !== sequence) return;
      closingDialogAnimation = null;
      closingBackdropAnimation = null;
      cancelAnimation(dialogAnimation);
      cancelAnimation(backdropAnimation);
      clearDialogMotion();
      root.style.removeProperty("transition");
      onCloseComplete?.();
    });
  }

  function destroy() {
    cancel();
    clearDialogMotion();
    root.style.removeProperty("transition");
  }

  return {
    prepareOpen,
    playOpen,
    startClose,
    cancel,
    destroy,
  };
}

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
  closeDuration = 800,
  onClosed,
}) {
  const documentRef = root.ownerDocument;
  const body = documentRef.body;

  root.classList.add("app-global-modal");
  dialog.classList.add("app-global-modal-dialog");
  root.setAttribute("aria-hidden", "true");
  const motion = createGlobalModalMotion({
    root,
    dialog,
    trigger,
    targetWidth,
    flipX: "--app-global-modal-flip-x",
    flipY: "--app-global-modal-flip-y",
    flipScale: "--app-global-modal-flip-scale",
    flipStartClass: "app-global-modal-dialog--flip-start",
    flipCloseClass: "app-global-modal-dialog--flip-close",
    closeDuration,
    onCloseComplete: () => {
      root.classList.remove("closing");
      onClosed?.();
    },
  });

  function getTrigger() {
    if (trigger && typeof trigger.getBoundingClientRect === "function") return trigger;
    const active = documentRef.activeElement;
    return active && typeof active.getBoundingClientRect === "function" ? active : null;
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

  function open() {
    root.classList.remove("closing");
    root.style.removeProperty("transition");
    motion.prepareOpen();
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    body.classList.add("app-modal-open");
    motion.playOpen();
    focusOnOpen();
  }

  function close() {
    if (!root.classList.contains("open")) return;
    motion.startClose();
    root.classList.remove("open");
    root.classList.add("closing");
    root.setAttribute("aria-hidden", "true");
    body.classList.remove("app-modal-open");
    restoreFocus();
  }

  function destroy() {
    motion.destroy();
    root.classList.remove("open", "closing");
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
