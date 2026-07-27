import { DepositRepository } from "../../infrastructure/firebase/deposit-repository.ts";
import { subscribeToDeposits } from "./sync.js";

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
  confirm = message => typeof windowRoot.confirm !== "function" || windowRoot.confirm(message),
}) {
  return {
    state,
    hosts: {
      root: documentRoot.getElementById("deposit-root"),
      form: documentRoot.getElementById("deposit-form-root"),
      reminder: documentRoot.getElementById("deposit-reminder-root"),
    },
    createRepository: user => new DepositRepository(db, projectId, user.uid),
    subscribe: callbacks => subscribeToDeposits(db, projectId, callbacks),
    getToday,
    getNextMidnightDelay,
    getLocale,
    queueLegacyInterest,
    confirm,
    isOnline: () => windowRoot.navigator.onLine,
    isDocumentHidden: () => documentRoot.hidden,
    addRuntimeListener(target, type, listener) {
      const eventTarget = target === "document" ? documentRoot : windowRoot;
      eventTarget.addEventListener(type, listener);
      return () => eventTarget.removeEventListener(type, listener);
    },
    setTimer: (callback, delay) => windowRoot.setTimeout(callback, delay),
    clearTimer: timer => windowRoot.clearTimeout(timer),
  };
}
