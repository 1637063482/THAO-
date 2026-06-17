import { state } from "./state.js";
import { expenseCategories, getDaysInMonth, TODAY, CURRENT_MONTH } from "./config.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { calculateAll } from "./budget.js";
import { triggerCloudSave } from "./sync.js";
import { updateStreakAfterRecord } from "./render.js";

export function openQuickAdd() {
  const modal = document.getElementById("quick-add-modal");
  const panel = document.getElementById("quick-add-panel");
  if (!modal || !panel) return;

  const monthDays = getDaysInMonth(state.activeYear, state.activeMonthId);
  const daySel = document.getElementById("qa-day");
  if (daySel) {
    daySel.innerHTML = "";
    for (let d = 1; d <= monthDays; d++) {
      const isToday = d === TODAY.getDate() && state.activeMonthId === CURRENT_MONTH && state.activeYear === TODAY.getFullYear();
      daySel.innerHTML += '<option value="' + d + '" ' + (isToday ? "selected" : "") + '>' + state.activeMonthId + '月' + d + '日</option>';
    }
  }

  const catSel = document.getElementById("qa-cat");
  if (catSel && catSel.options.length === 0) {
    expenseCategories.forEach((c) => { catSel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>'; });
    catSel.innerHTML += '<option value="income">当日总收入</option>';
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

  if (!rawAmt || isNaN(rawAmt)) { showToast("请输入有效纯数字金额", true); return; }

  let amtVND = rawAmt;
  if (state.currentCurrency === "CNY") amtVND = (parseFloat(rawAmt) * getActiveRate()).toString();

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

  showToast("记录已追加");
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