import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday } from "./clock.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { convertCnyAmountToVnd, isValidCurrencyRate } from "./currency-view.js";
import { calculateAll } from "./budget.js";
import { triggerCloudSave } from "./sync.js";
import { updateStreakAfterRecord } from "./render.js";
import { t } from "./i18n.js";

export function openQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;

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
  modal.style.opacity = '0';
  panel.style.transform = 'scale(0.95)';
  setTimeout(() => { modal.style.display = 'none';  }, 300);
}

export function submitQuickAdd() {
  const d = document.getElementById("qa-day")?.value;
  const cat = document.getElementById("qa-cat")?.value;
  const rawAmt = document.getElementById("qa-amount")?.value;
  const remark = document.getElementById("qa-remark")?.value;

  if (!rawAmt || isNaN(rawAmt)) { showToast(t("enter_valid_amount"), true); return; }

  let amtVND = rawAmt;
  if (state.currentCurrency === "CNY") {
    const activeRate = getActiveRate();
    if (!isValidCurrencyRate(activeRate)) {
      showToast(t("fx_unavailable"), true);
      return;
    }
    amtVND = convertCnyAmountToVnd(rawAmt, activeRate);
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

  showToast(t("record_saved"));
  closeQuickAdd();
  const qaAmt = document.getElementById("qa-amount");
  const qaRemark = document.getElementById("qa-remark");
  if (qaAmt) qaAmt.value = "";
  if (qaRemark) qaRemark.value = "";

  calculateAll();
  triggerCloudSave();
  updateStreakAfterRecord();

  setTimeout(() => {
    const el = document.getElementById("row-" + state.activeMonthId + "-" + d);
    const scrollContainer = document.getElementById("table-scroll-container-" + state.activeMonthId);
    if (el && scrollContainer) scrollContainer.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
  }, 200);
}
