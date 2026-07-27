import { getLedgerToday } from "./clock.js";
import { createEmptyDepositDocument } from "./deposit-schema.js";

/** @type {Map<string, Set<(payload: unknown) => void>>} */
const listeners = new Map();
const initialLedgerDate = getLedgerToday();

/**
 * @param {string} event
 * @param {(payload: unknown) => void} fn
 */
export function on(event, fn) {
  let eventListeners = listeners.get(event);
  if (!eventListeners) {
    eventListeners = new Set();
    listeners.set(event, eventListeners);
  }
  eventListeners.add(fn);
  return () => listeners.get(event)?.delete(fn);
}

/** @type {import("../types/app-state").ApplicationState} */
export const state = {
  activeYear: initialLedgerDate.year,
  activeMonthId: initialLedgerDate.month,
  currentCurrency: "VND",
  fxMode: "auto",
  fxRateAuto: null,
  fxRateManual: 3500,
  isSaving: false,
  isFirstLoad: true,
  currentUser: null,
  appState: { balances: {}, entries: {}, settings: {} },
  depositDocument: createEmptyDepositDocument(),
  previousYearEntries: {},
  pendingUpdates: { balances: {}, entries: {}, settings: {} },
  yearlyCatSums: {},
  monthlyCatSums: {},
  totalRecords: 0,
  currentStreak: 0,
  monthsUnderBudget: 0,
  categoriesUsed: 0,
  unlockedAchievements: [],
};

export function getActiveRate() {
  return state.fxMode === "auto" ? state.fxRateAuto : state.fxRateManual;
}

export function copyPending() {
  /** @type {import("../types/app-state").PendingLedgerUpdates} */
  const copy = { balances: {}, entries: {}, settings: {} };
  const p = state.pendingUpdates;
  if (Object.keys(p.balances).length) copy.balances = { ...p.balances };
  if (Object.keys(p.entries).length) copy.entries = { ...p.entries };
  if (Object.keys(p.settings).length) copy.settings = { ...state.appState.settings };
  return copy;
}

export function clearPending() {
  state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
}

export function resetLedgerYearState() {
  state.appState = { balances: {}, entries: {}, settings: {} };
  state.previousYearEntries = {};
  state.yearlyCatSums = {};
  state.monthlyCatSums = {};
  clearPending();
}

/** @param {Partial<import("../types/app-state").PendingLedgerUpdates>} copy */
export function mergeBackPending(copy) {
  Object.entries(copy.balances || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.balances)) state.pendingUpdates.balances[key] = value;
  });
  Object.entries(copy.entries || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.entries)) state.pendingUpdates.entries[key] = value;
  });
  Object.entries(copy.settings || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.settings)) state.pendingUpdates.settings[key] = value;
  });
}

export function hasPending() {
  const p = state.pendingUpdates;
  return Object.keys(p.balances).length > 0 ||
         Object.keys(p.entries).length > 0 ||
         Object.keys(p.settings).length > 0;
}

/** @param {import("../types/app-state").AuthUser | null} user */
export function emitAuthChange(user) {
  listeners.get("auth-change")?.forEach(fn => fn(user));
}

export default state;
