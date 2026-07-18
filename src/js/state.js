const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}

export const state = {
  activeYear: new Date().getFullYear(),
  activeMonthId: new Date().getMonth() + 1,
  currentCurrency: "VND",
  fxMode: "auto",
  fxRateAuto: 3500,
  fxRateManual: 3500,
  isSaving: false,
  isFirstLoad: true,
  currentUser: null,
  appState: { balances: {}, entries: {}, settings: {} },
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

export function mergeBackPending(copy) {
  ["balances", "entries", "settings"].forEach((section) => {
    if (!copy[section]) return;
    Object.entries(copy[section]).forEach(([key, value]) => {
      if (!(key in state.pendingUpdates[section])) state.pendingUpdates[section][key] = value;
    });
  });
}

export function hasPending() {
  const p = state.pendingUpdates;
  return Object.keys(p.balances).length > 0 ||
         Object.keys(p.entries).length > 0 ||
         Object.keys(p.settings).length > 0;
}

export function emitAuthChange(user) {
  listeners.get("auth-change")?.forEach(fn => fn(user));
}

export default state;
