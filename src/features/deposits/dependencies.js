import { DepositRepository } from "../../infrastructure/firebase/deposit-repository.ts";
import { subscribeToDeposits } from "./sync.js";

/** @param {import("../../types/app-state").DepositDependenciesInput} input */
export function createDepositDependencies({
  db,
  projectId,
  state,
  getToday,
  getNextMidnightDelay,
  getLocale,
  queueLegacyInterest,
  documentRoot = document,
  windowRoot = window,
  confirm = /** @param {string} message */ message => typeof windowRoot.confirm !== "function" || windowRoot.confirm(message),
}) {
  /** @param {import("../../types/app-state").AuthUser} user */
  const createRepository = (user) => new DepositRepository(db, projectId, user.uid);
  /** @param {import("../../types/app-state").DepositSnapshotCallbacks} callbacks */
  const subscribe = (callbacks) => subscribeToDeposits(db, projectId, callbacks);
  return {
    state,
    hosts: {
      root: documentRoot.getElementById("deposit-root"),
      form: documentRoot.getElementById("deposit-form-root"),
      reminder: documentRoot.getElementById("deposit-reminder-root"),
    },
    createRepository,
    subscribe,
    getToday,
    getNextMidnightDelay,
    getLocale,
    queueLegacyInterest,
    confirm,
    isOnline: () => windowRoot.navigator.onLine,
    isDocumentHidden: () => documentRoot.hidden,
    /**
     * @param {"document" | "window"} target
     * @param {string} type
     * @param {EventListener} listener
     */
    addRuntimeListener(target, type, listener) {
      const eventTarget = target === "document" ? documentRoot : windowRoot;
      eventTarget.addEventListener(type, listener);
      return () => eventTarget.removeEventListener(type, listener);
    },
    setTimer: (/** @type {() => void} */ callback, /** @type {number} */ delay) => windowRoot.setTimeout(callback, delay),
    clearTimer: (/** @type {number} */ timer) => windowRoot.clearTimeout(timer),
  };
}
