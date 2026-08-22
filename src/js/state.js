import { getLedgerToday } from "./clock.js";
import { createEmptyDepositDocument } from "./deposit-schema.js";
import { captureSettingBase } from "../domain/ledger-conflicts.js";

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
  fxRateManual: 3700,
  isSaving: false,
  isFirstLoad: true,
  currentUser: null,
  appState: { balances: {}, entries: {}, settings: {}, operationsById: {} },
  depositDocument: createEmptyDepositDocument(),
  previousYearEntries: {},
  pendingUpdates: { balances: {}, entries: {}, settings: {}, operationsById: {} },
  pendingSettingsBases: {},
  syncConflicts: { settings: [] },
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
  const copy = { balances: {}, entries: {}, settings: {}, operationsById: {} };
  const p = state.pendingUpdates;
  if (Object.keys(p.balances || {}).length) copy.balances = { ...p.balances };
  if (Object.keys(p.entries || {}).length) copy.entries = { ...p.entries };
  if (Object.keys(p.settings || {}).length) copy.settings = { ...p.settings };
  if (Object.keys(p.operationsById || {}).length) copy.operationsById = { ...p.operationsById };
  return copy;
}

export function clearPending() {
  state.pendingUpdates = { balances: {}, entries: {}, settings: {}, operationsById: {} };
  state.pendingSettingsBases = {};
}

export function resetLedgerYearState() {
  state.appState = { balances: {}, entries: {}, settings: {}, operationsById: {} };
  state.previousYearEntries = {};
  state.yearlyCatSums = {};
  state.monthlyCatSums = {};
  state.syncConflicts = { settings: [] };
  clearPending();
}

/** @param {string} key @param {import("../types/app-state").LedgerSettingValue} value */
export function stagePendingSetting(key, value) {
  if (!state.pendingUpdates.settings) state.pendingUpdates.settings = {};
  if (!state.pendingSettingsBases) state.pendingSettingsBases = {};
  if (!Object.prototype.hasOwnProperty.call(state.pendingUpdates.settings, key)) {
    state.pendingSettingsBases[key] = captureSettingBase(state.appState.settings || {}, key);
  }
  state.pendingUpdates.settings[key] = value;
}

export function copyPendingSettingsBases() {
  return { settings: { ...(state.pendingSettingsBases || {}) } };
}

/** @param {Partial<import("../types/app-state").PendingLedgerUpdates>} copy @param {{ settings?: Record<string, import("../types/app-state").PendingSettingBase> }} [bases] */
export function mergeBackPending(copy, bases = {}) {
  if (!state.pendingUpdates.balances) state.pendingUpdates.balances = {};
  if (!state.pendingUpdates.entries) state.pendingUpdates.entries = {};
  if (!state.pendingUpdates.settings) state.pendingUpdates.settings = {};
  if (!state.pendingUpdates.operationsById) state.pendingUpdates.operationsById = {};
  Object.entries(copy.balances || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.balances)) state.pendingUpdates.balances[key] = value;
  });
  Object.entries(copy.entries || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.entries)) state.pendingUpdates.entries[key] = value;
  });
  Object.entries(copy.settings || {}).forEach(([key, value]) => {
    if (!(key in state.pendingUpdates.settings)) {
      state.pendingUpdates.settings[key] = value;
      if (bases.settings?.[key]) state.pendingSettingsBases[key] = bases.settings[key];
    }
  });
  Object.entries(copy.operationsById || {}).forEach(([key, value]) => {
    if (!(key in (state.pendingUpdates.operationsById || {}))) {
      if (!state.pendingUpdates.operationsById) state.pendingUpdates.operationsById = {};
      state.pendingUpdates.operationsById[key] = value;
    }
  });
}

export function hasPending() {
  const p = state.pendingUpdates;
  return Object.keys(p.balances || {}).length > 0 ||
         Object.keys(p.entries || {}).length > 0 ||
         Object.keys(p.settings || {}).length > 0 ||
         Object.keys(p.operationsById || {}).length > 0;
}

/** @param {import("../types/app-state").AuthUser | null} user */
export function emitAuthChange(user) {
  listeners.get("auth-change")?.forEach(fn => fn(user));
}

export default state;
