import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday } from "./clock.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { convertCnyAmountToVnd, isValidCurrencyRate } from "./currency-view.js";
import { calculateAll } from "./budget.js";
import { triggerCloudSave } from "./sync.js";
import { updateStreakAfterRecord } from "./render.js";
import { t } from "./i18n.js";

let lastTrigger = null;
let submitInFlight = false;

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

export function openQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;
  resetSubmitControl();
  lastTrigger = document.getElementById("fab-btn") || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("is-open");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const monthDays = getDaysInMonth(state.activeYear, state.activeMonthId);
  const daySel = document.getElementById("qa-day");
  if (daySel) {
    const today = getLedgerToday();
    daySel.innerHTML = "";
    for (let d = 1; d <= monthDays; d++) {
      const isToday = d === today.day && state.activeMonthId === today.month && state.activeYear === today.year;
      daySel.innerHTML += '<option value="' + d + '" ' + (isToday ? "selected" : "") + '>' + t("month_display", { month: state.activeMonthId }) + " " + t("day_display", { day: d }) + '</option>';
    }
  }

  const catSel = document.getElementById("qa-cat");
  if (catSel && catSel.options.length === 0) {
    expenseCategories.forEach((c) => { catSel.innerHTML += '<option value="' + c.id + '">' + t(c.nameKey || c.name) + '</option>'; });
    catSel.innerHTML += '<option value="income">' + t("income_total") + '</option>';
  }

  modal.style.display = 'flex';
  
  setTimeout(() => {
    modal.style.opacity = '1';
    panel.style.transform = 'scale(1)';
    document.getElementById("qa-amount")?.focus();
  }, 10);
}

export function closeQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("is-open");
  modal.style.opacity = '0';
  panel.style.transform = 'scale(0.95)';
  setTimeout(() => { modal.style.display = 'none'; if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus(); }, 300);
}

if (typeof document !== "undefined") {
  if (window.__quickAddEscapeHandler) document.removeEventListener("keydown", window.__quickAddEscapeHandler);
  window.__quickAddEscapeHandler = (event) => {
    const modal = document.getElementById("quick-add-modal");
    const panel = document.getElementById("quick-add-panel");
    if (!modal?.classList.contains("is-open")) return;
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

  const d = document.getElementById("qa-day")?.value;
  const cat = document.getElementById("qa-cat")?.value;
  const rawAmt = document.getElementById("qa-amount")?.value;
  const remark = document.getElementById("qa-remark")?.value;

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

  const key = state.activeMonthId + "_" + d + "_" + cat;
  const remarkKey = state.activeMonthId + "_" + d + "_remark";

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
    const rEl = document.getElementById("entry-" + state.activeMonthId + "-" + d + "-remark");
    if (rEl) { rEl.value = newRemark; rEl.dataset.raw = newRemark; }
  }

  const iEl = document.getElementById("entry-" + state.activeMonthId + "-" + d + "-" + cat);
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
    const el = document.getElementById("row-" + state.activeMonthId + "-" + d);
    const scrollContainer = document.getElementById("table-scroll-container-" + state.activeMonthId);
    if (el && scrollContainer) scrollContainer.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
  }, 200);
}
