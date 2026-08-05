import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday } from "./clock.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { convertCnyAmountToVnd, formatCurrencyInput, isValidCurrencyRate, normalizeCurrencyInput } from "./currency-view.js";
import { calculateAll } from "./budget.js";
import { triggerCloudSave } from "./sync.js";
import { updateStreakAfterRecord } from "./render.js";
import { t } from "./i18n.js";
import { bindAppDropdown, getAppDropdownValue, setAppDropdownOptions } from "../components/feedback/app-dropdown.js";
import { createGlobalModalController } from "../components/feedback/global-modal.js";

let lastTrigger = null;
let submitInFlight = false;
/** @type {ReturnType<typeof createGlobalModalController> | null} */
let quickAddModalController = null;

const LEGACY_OPERATION_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/**
 * Queue actual deposit interest into the legacy yearly ledger exactly once.
 * Deposit principal is intentionally absent from this API.
 */
export async function queueLegacyIncomeOnce(
  { amountVnd, dateKey, operationId, note = "Lãi tiền gửi" },
  { stateRef = state, onQueue = triggerCloudSave, onStreak = updateStreakAfterRecord } = {},
) {
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) throw new Error("Income must be a positive safe integer VND amount");
  if (!isValidDateKey(dateKey)) throw new Error("Income date is invalid");
  if (!LEGACY_OPERATION_ID_RE.test(operationId)) throw new Error("Operation id is invalid");
  const [year, month, day] = dateKey.split("-").map(Number);
  if (year !== stateRef.activeYear) throw new Error("Income date is outside the active ledger year");

  const incomeKey = `${month}_${day}_income`;
  const remarkKey = `${month}_${day}_remark`;
  const marker = `[#op:${operationId}]`;
  const entries = stateRef.appState.entries;
  const pending = stateRef.pendingUpdates.entries || (stateRef.pendingUpdates.entries = {});
  if (String(entries[remarkKey] || "").includes(marker)) return { applied: false, operationId };

  const snapshots = [incomeKey, remarkKey].map(key => ({
    key,
    entryPresent: Object.prototype.hasOwnProperty.call(entries, key), entryValue: entries[key],
    pendingPresent: Object.prototype.hasOwnProperty.call(pending, key), pendingValue: pending[key],
  }));
  let existing = String(entries[incomeKey] || "0");
  if (existing.startsWith("=")) existing = existing.slice(1);
  const formula = `=${existing === "0" || existing === "" ? "" : `${existing}+`}${amountVnd}`;
  const oldRemark = String(entries[remarkKey] || "");
  const newRemark = `${oldRemark ? `${oldRemark},` : ""}${String(note).trim() || "Lãi tiền gửi"} ${marker}`;
  entries[incomeKey] = formula; pending[incomeKey] = formula;
  entries[remarkKey] = newRemark; pending[remarkKey] = newRemark;

  try { await onQueue(); }
  catch (error) {
    snapshots.forEach(snapshot => {
      if (snapshot.entryPresent) entries[snapshot.key] = snapshot.entryValue; else delete entries[snapshot.key];
      if (snapshot.pendingPresent) pending[snapshot.key] = snapshot.pendingValue; else delete pending[snapshot.key];
    });
    throw error;
  }
  await onStreak();
  return { applied: true, operationId };
}

function resetSubmitControl() {
  const submitButton = document.querySelector("#quick-add-panel [data-quick-add-submit]");
  submitInFlight = false;
  if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); }
}

function formatQuickAddAmountInput(input) {
  const selectionStart = input.selectionStart ?? input.value.length;
  const significantBeforeCaret = input.value.slice(0, selectionStart).replace(/[^\d.]/g, "").length;
  const formatted = formatCurrencyInput(input.value, state.currentCurrency);
  input.value = formatted;
  if (document.activeElement === input) {
    let seen = 0;
    let caret = formatted.length;
    for (let index = 0; index < formatted.length; index += 1) {
      if (/[\d.]/.test(formatted[index])) seen += 1;
      if (seen === significantBeforeCaret) {
        caret = index + 1;
        break;
      }
    }
    input.setSelectionRange(caret, caret);
  }
}

function bindQuickAddAmountInput() {
  const input = document.getElementById("qa-amount");
  if (!input || input.dataset.amountFormattingBound === "1") return;
  input.type = "text";
  input.inputMode = "decimal";
  input.addEventListener("input", () => formatQuickAddAmountInput(input));
  input.dataset.amountFormattingBound = "1";
}

export function refreshQuickAddAmountInput() {
  const input = document.getElementById("qa-amount");
  if (input) formatQuickAddAmountInput(input);
}

/** @param {HTMLElement} modal @param {HTMLElement} panel */
function ensureQuickAddPortal(modal, panel) {
  if (modal.parentElement !== document.body) document.body.appendChild(modal);
  if (!quickAddModalController) {
    quickAddModalController = createGlobalModalController({
      root: modal,
      dialog: panel,
      trigger: lastTrigger,
      focusSelector: "#qa-amount",
      targetWidth: 560,
    });
  }
}

function buildQuickAddDayOptions({ selectDefault = false } = {}) {
  const today = getLedgerToday();
  const monthDays = getDaysInMonth(state.activeYear, state.activeMonthId);
  const isCurrentMonth = state.activeYear === today.year && state.activeMonthId === today.month;
  const defaultDay = isCurrentMonth ? Math.min(today.day, monthDays) : 1;
  return Array.from({ length: monthDays }, (_, index) => {
    const day = index + 1;
    return {
      value: String(day),
      label: `${t("month_display", { month: state.activeMonthId })} ${t("day_display", { day })}`,
      selected: selectDefault && day === defaultDay,
    };
  });
}

function buildQuickAddCategoryOptions() {
  return [
    ...expenseCategories.map((category) => ({ value: category.id, label: t(category.nameKey || category.name) })),
    { value: "income", label: t("income_total") },
  ];
}

function refreshQuickAddDropdownLabels({ selectDefaults = false } = {}) {
  const dayHost = document.getElementById("qa-day");
  if (dayHost) {
    setAppDropdownOptions(dayHost, buildQuickAddDayOptions({ selectDefault: selectDefaults }), {
      preserveValue: !selectDefaults,
      autoSelectFirst: selectDefaults,
    });
  }
  const catHost = document.getElementById("qa-cat");
  if (catHost) {
    setAppDropdownOptions(catHost, buildQuickAddCategoryOptions(), {
      preserveValue: true,
      autoSelectFirst: selectDefaults,
    });
  }
}

export function openQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;
  lastTrigger = document.getElementById("fab-btn") || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  ensureQuickAddPortal(modal, panel);
  bindQuickAddAmountInput();
  resetSubmitControl();
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  refreshQuickAddDropdownLabels({ selectDefaults: true });
  modal.classList.add("is-open");
  quickAddModalController.open();
}

export function closeQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;
  modal.classList.remove("is-open");
  if (quickAddModalController) quickAddModalController.close();
  else modal.setAttribute("aria-hidden", "true");
}

if (typeof document !== "undefined") {
  bindQuickAddAmountInput();
  bindAppDropdown(document.getElementById("qa-day"));
  bindAppDropdown(document.getElementById("qa-cat"));
  const quickAddModal = document.getElementById("quick-add-modal");
  if (quickAddModal) {
    if (window.__quickAddBackdropHandler) quickAddModal.removeEventListener("click", window.__quickAddBackdropHandler);
    window.__quickAddBackdropHandler = event => {
      if (event.target === event.currentTarget) closeQuickAdd();
    };
    quickAddModal.addEventListener("click", window.__quickAddBackdropHandler);
  }
  if (window.__quickAddLocaleHandler) window.removeEventListener("locale-changed", window.__quickAddLocaleHandler);
  window.__quickAddLocaleHandler = () => refreshQuickAddDropdownLabels();
  window.addEventListener("locale-changed", window.__quickAddLocaleHandler);
  if (window.__quickAddEscapeHandler) document.removeEventListener("keydown", window.__quickAddEscapeHandler);
  window.__quickAddEscapeHandler = (event) => {
    const modal = document.getElementById("quick-add-modal");
    const panel = document.getElementById("quick-add-panel");
    if (!modal?.classList.contains("open")) return;
    if (event.key === "Escape") {
      closeQuickAdd();
      return;
    }
    if (event.key === "Tab" && panel) {
      const focusable = [...panel.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((el) => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", window.__quickAddEscapeHandler);
}

export function submitQuickAdd() {
  if (submitInFlight) return;
  submitInFlight = true;
  const submitButton = document.querySelector("#quick-add-panel [data-quick-add-submit]");
  if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); }

  const d = getAppDropdownValue(document.getElementById("qa-day"));
  const cat = getAppDropdownValue(document.getElementById("qa-cat"));
  const rawAmt = normalizeCurrencyInput(document.getElementById("qa-amount")?.value);
  const remark = document.getElementById("qa-remark")?.value;

  const month = Number(state.activeMonthId);
  const year = Number(state.activeYear);
  const day = Number(d);
  const validCategories = new Set([...expenseCategories.map(category => category.id), "income"]);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || !Number.isInteger(day) || day < 1 || day > getDaysInMonth(year, month)) {
    showToast(t("quick_add_invalid_date"), true);
    resetSubmitControl();
    return;
  }
  if (!validCategories.has(cat)) {
    showToast(t("quick_add_invalid_category"), true);
    resetSubmitControl();
    return;
  }

  if (!rawAmt || isNaN(rawAmt)) { showToast(t("enter_valid_amount"), true); resetSubmitControl(); return; }

  let amtVND = rawAmt;
  if (state.currentCurrency === "CNY") {
    const activeRate = getActiveRate();
    if (!isValidCurrencyRate(activeRate)) {
      showToast(t("fx_unavailable"), true);
      resetSubmitControl(); return;
    }
    amtVND = convertCnyAmountToVnd(rawAmt, activeRate);
  }
  if (!Number.isSafeInteger(Number(amtVND)) || Number(amtVND) <= 0) {
    showToast(t("enter_valid_amount"), true);
    resetSubmitControl();
    return;
  }

  const key = month + "_" + day + "_" + cat;
  const remarkKey = month + "_" + day + "_remark";

  let existingFormula = state.appState.entries[key] || "0";
  if (String(existingFormula).startsWith("=")) existingFormula = existingFormula.substring(1);
  if (existingFormula === "0" || existingFormula === "") existingFormula = "";
  else existingFormula += "+";

  const finalMath = "=" + existingFormula + amtVND;
  state.appState.entries[key] = finalMath;
  if (!state.pendingUpdates.entries) state.pendingUpdates.entries = {};
  state.pendingUpdates.entries[key] = finalMath;

  if (remark) {
    let oldRemark = state.appState.entries[remarkKey] || "";
    let newRemark = oldRemark ? oldRemark + "," + remark : remark;
    state.appState.entries[remarkKey] = newRemark;
    state.pendingUpdates.entries[remarkKey] = newRemark;
    const rEl = document.getElementById("entry-" + month + "-" + day + "-remark");
    if (rEl) { rEl.value = newRemark; rEl.dataset.raw = newRemark; }
  }

  const iEl = document.getElementById("entry-" + month + "-" + day + "-" + cat);
  if (iEl) { iEl.dataset.raw = finalMath; iEl.value = formatDisplay(safeEval(finalMath)); }

  calculateAll();
  try {
    triggerCloudSave();
  } catch (error) {
    resetSubmitControl();
    throw error;
  }
  showToast(t("record_saved"));
  closeQuickAdd();
  const qaAmt = document.getElementById("qa-amount");
  const qaRemark = document.getElementById("qa-remark");
  if (qaAmt) qaAmt.value = "";
  if (qaRemark) qaRemark.value = "";

  updateStreakAfterRecord();
  resetSubmitControl();

  setTimeout(() => {
    const el = document.getElementById("row-" + month + "-" + day);
    const scrollContainer = document.getElementById("table-scroll-container-" + month);
    if (el && scrollContainer) scrollContainer.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
  }, 200);
}
