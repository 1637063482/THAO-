import { initDockRefraction } from "./dock-refraction.js";

const DRAG_THRESHOLD = 8;
const VERTICAL_CANCEL_THRESHOLD = 10;
const FLICK_VELOCITY_THRESHOLD = 0.6;
const SETTLE_DURATION = 360;

/**
 * @param {HTMLElement} bottomNav
 * @param {{ getActive: () => string, onCommit: (id: string) => void }} options
 * @returns {{ sync: (id: string) => void, cleanup: () => void }}
 */
export function initDockGesture(bottomNav, options) {
  /** @type {HTMLElement | null} */
  const lensElement = bottomNav.querySelector("[data-bottom-nav-lens]");
  /** @type {HTMLElement[]} */
  const items = Array.from(bottomNav.querySelectorAll(".bottom-nav-item"));
  if (!lensElement || !items.length) {
    return { sync() {}, cleanup() {} };
  }
  const lens = /** @type {HTMLElement} */ (lensElement);
  const refraction = initDockRefraction(bottomNav, lens);

  /** @type {{ pointerId: number, button: HTMLElement, startX: number, startY: number, lastX: number, lastTime: number, velocityX: number, dragging: boolean, targetIndex: number } | null} */
  let pointerState = null;
  let settleTimer = 0;
  let settlingId = "";
  let suppressNextClick = false;

  function reducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function getMetrics() {
    const navRect = bottomNav.getBoundingClientRect();
    if (!navRect.width) return null;
    const itemRects = items.map((item) => item.getBoundingClientRect());
    if (itemRects.some((rect) => !rect.width)) return null;
    return { navRect, itemRects, left: navRect.left + bottomNav.clientLeft };
  }

  function clearSettleTimer() {
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = 0;
  }

  function setLens(/** @type {number} */ x, /** @type {number} */ width, scaleX = 1, lifted = false, origin = "50%") {
    lens.style.setProperty("--dock-lens-x", x + "px");
    lens.style.setProperty("--dock-lens-width", width + "px");
    lens.style.setProperty("--dock-lens-scale-x", String(scaleX));
    lens.style.setProperty("--dock-lens-scale-y", String(lifted ? 1.07 - (scaleX - 1) * 0.45 : 1));
    lens.style.setProperty("--dock-lens-origin", origin);
  }

  function clearPreview() {
    items.forEach((item) => item.classList.remove("dock-preview"));
  }

  function activeIndex(/** @type {string} */ id) {
    return Math.max(0, items.findIndex((item) => item.getAttribute("data-nav") === id));
  }

  function positionAt(/** @type {number} */ index, /** @type {boolean} */ animate) {
    refraction.setEngaged(false);
    const metrics = getMetrics();
    if (!metrics) {
      clearSettleTimer();
      settlingId = "";
      clearPreview();
      bottomNav.classList.remove("dock-lens-ready", "dock-lens-engaged", "dock-lens-interacting", "dock-lens-settling");
      return false;
    }

    const item = items[index];
    const rect = metrics.itemRects[index];
    const x = rect.left - metrics.left;
    bottomNav.classList.add("dock-lens-ready");
    clearSettleTimer();
    settlingId = item.getAttribute("data-nav") || "";
    clearPreview();
    bottomNav.classList.remove("dock-lens-interacting");
    bottomNav.classList.add("dock-lens-engaged");
    if (animate && !reducedMotion()) {
      bottomNav.classList.add("dock-lens-settling");
      setLens(x, rect.width, 1, false, "50%");
      settleTimer = window.setTimeout(() => {
        bottomNav.classList.remove("dock-lens-settling", "dock-lens-engaged");
        settlingId = "";
        settleTimer = 0;
      }, SETTLE_DURATION);
    } else {
      bottomNav.classList.remove("dock-lens-settling", "dock-lens-engaged");
      setLens(x, rect.width, 1, false, "50%");
      settlingId = "";
    }
    return true;
  }

  function sync(/** @type {string} */ id) {
    if (pointerState) cancelGesture(true);
    if (settlingId === id) return;
    positionAt(activeIndex(id), true);
  }

  function nearestItemIndex(/** @type {number} */ x, /** @type {NonNullable<ReturnType<typeof getMetrics>>} */ metrics) {
    let nearest = 0;
    let distance = Infinity;
    metrics.itemRects.forEach((rect, index) => {
      const center = rect.left - metrics.left + rect.width / 2;
      const currentDistance = Math.abs(x - center);
      if (currentDistance < distance) {
        nearest = index;
        distance = currentDistance;
      }
    });
    return nearest;
  }

  function dragPosition(/** @type {PointerEvent} */ event, /** @type {NonNullable<typeof pointerState> } */ state, /** @type {NonNullable<ReturnType<typeof getMetrics>>} */ metrics) {
    const localX = event.clientX - metrics.left;
    const width = metrics.itemRects[state.targetIndex].width;
    const firstCenter = metrics.itemRects[0].left - metrics.left + metrics.itemRects[0].width / 2;
    const lastRect = metrics.itemRects[metrics.itemRects.length - 1];
    const lastCenter = lastRect.left - metrics.left + lastRect.width / 2;
    const minX = firstCenter - width / 2;
    const maxX = lastCenter - width / 2;
    let x = localX - width / 2;

    if (x < minX) x = minX + Math.max(x - minX, -width * 0.65) * 0.24;
    if (x > maxX) x = maxX + Math.min(x - maxX, width * 0.65) * 0.24;

    items.forEach((item, index) => item.classList.toggle("dock-preview", index === state.targetIndex));
    const stretch = reducedMotion() ? 0 : Math.min(0.16, Math.abs(state.velocityX) * 0.08);
    setLens(x, width, 1 + stretch, !reducedMotion(), state.velocityX < 0 ? "100%" : "0%");
  }

  function releaseCapture(/** @type {NonNullable<typeof pointerState> } */ state) {
    if (typeof state.button.releasePointerCapture !== "function") return;
    try {
      state.button.releasePointerCapture(state.pointerId);
    } catch (_error) {
      // Capture may already have been released by the browser.
    }
  }

  function cancelGesture(/** @type {boolean} */ release) {
    const state = pointerState;
    if (!state) return;
    pointerState = null;
    if (release) releaseCapture(state);
    if (state.dragging) positionAt(activeIndex(options.getActive()), true);
  }

  function buttonFromTarget(/** @type {EventTarget | null} */ target) {
    if (!(target instanceof Element)) return null;
    const button = target.closest(".bottom-nav-item");
    return button instanceof HTMLElement && bottomNav.contains(button) ? button : null;
  }

  function onPointerDown(/** @type {PointerEvent} */ event) {
    if (event.isPrimary === false || event.button !== 0) return;
    suppressNextClick = false;
    if (pointerState) return;

    const button = buttonFromTarget(event.target);
    const index = button ? items.indexOf(button) : -1;
    const metrics = getMetrics();
    if (!button || index < 0 || !metrics) return;

    pointerState = {
      pointerId: event.pointerId,
      button,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
      dragging: false,
      targetIndex: index,
    };
    if (typeof button.setPointerCapture === "function") {
      try {
        button.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Some embedded browsers can reject capture for a pointer already leaving the view.
      }
    }
  }

  function onPointerMove(/** @type {PointerEvent} */ event) {
    const state = pointerState;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.dragging) {
      if (Math.abs(dy) >= VERTICAL_CANCEL_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        cancelGesture(true);
        return;
      }
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      state.dragging = true;
      bottomNav.classList.add("dock-lens-ready", "dock-lens-engaged", "dock-lens-interacting");
      bottomNav.classList.remove("dock-lens-settling");
      refraction.setEngaged(!reducedMotion());
      clearSettleTimer();
      settlingId = "";
      clearPreview();
    }

    const metrics = getMetrics();
    if (!metrics) {
      cancelGesture(true);
      return;
    }
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.velocityX = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    state.targetIndex = nearestItemIndex(event.clientX - metrics.left, metrics);
    event.preventDefault();
    dragPosition(event, state, metrics);
  }

  function onPointerUp(/** @type {PointerEvent} */ event) {
    const state = pointerState;
    if (!state || state.pointerId !== event.pointerId) return;
    pointerState = null;

    if (!state.dragging) {
      return;
    }

    const metrics = getMetrics();
    if (!metrics) {
      positionAt(activeIndex(options.getActive()), false);
      return;
    }
    const releaseDx = event.clientX - state.lastX;
    const releaseTime = event.timeStamp - state.lastTime;
    if (releaseDx && releaseTime > 0) state.velocityX = releaseDx / releaseTime;
    else if (releaseTime > 120) state.velocityX = 0;
    state.targetIndex = nearestItemIndex(event.clientX - metrics.left, metrics);
    dragPosition(event, state, metrics);

    suppressNextClick = true;
    const direction = Math.abs(state.velocityX) >= FLICK_VELOCITY_THRESHOLD ? Math.sign(state.velocityX) : 0;
    const index = Math.max(0, Math.min(items.length - 1, state.targetIndex + direction));
    const id = items[index].getAttribute("data-nav");
    positionAt(index, true);
    event.preventDefault();
    if (id && id !== options.getActive()) options.onCommit(id);
  }

  function onPointerCancel(/** @type {PointerEvent} */ event) {
    if (pointerState && pointerState.pointerId === event.pointerId) cancelGesture(false);
  }

  function onLostPointerCapture(/** @type {PointerEvent} */ event) {
    if (pointerState && pointerState.pointerId === event.pointerId) cancelGesture(false);
  }

  function onClickCapture(/** @type {MouseEvent} */ event) {
    if (!suppressNextClick || event.detail === 0 || !(event.target instanceof Node) || !bottomNav.contains(event.target)) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onResize() {
    if (pointerState) cancelGesture(true);
    positionAt(activeIndex(options.getActive()), false);
    refraction.refresh();
  }

  bottomNav.addEventListener("pointerdown", onPointerDown);
  bottomNav.addEventListener("pointermove", onPointerMove);
  bottomNav.addEventListener("pointerup", onPointerUp);
  bottomNav.addEventListener("pointercancel", onPointerCancel);
  bottomNav.addEventListener("lostpointercapture", onLostPointerCapture);
  bottomNav.addEventListener("click", onClickCapture, true);
  window.addEventListener("resize", onResize);
  positionAt(activeIndex(options.getActive()), false);
  refraction.refresh();

  return {
    sync,
    cleanup() {
      const state = pointerState;
      pointerState = null;
      if (state) releaseCapture(state);
      clearSettleTimer();
      settlingId = "";
      suppressNextClick = false;
      clearPreview();
      refraction.cleanup();
      bottomNav.classList.remove("dock-lens-ready", "dock-lens-engaged", "dock-lens-interacting", "dock-lens-settling");
      bottomNav.removeEventListener("pointerdown", onPointerDown);
      bottomNav.removeEventListener("pointermove", onPointerMove);
      bottomNav.removeEventListener("pointerup", onPointerUp);
      bottomNav.removeEventListener("pointercancel", onPointerCancel);
      bottomNav.removeEventListener("lostpointercapture", onLostPointerCapture);
      bottomNav.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("resize", onResize);
    },
  };
}
