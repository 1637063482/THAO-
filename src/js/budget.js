import { state } from "./state.js";
import { expenseCategories, DEFAULT_BUDGET_VND } from "./config.js";
import { safeEval, formatDisplay, formatSymbol, getActiveRate } from "./utils.js";
import { updateCharts } from "./charts.js";
import { triggerCloudSave } from "./sync.js";

export function getRawBudgetVND() {
  const settings = state.appState.settings;
  if (settings && settings["budget_" + state.activeMonthId] !== undefined) {
    return parseFloat(settings["budget_" + state.activeMonthId]);
  }
  if (settings && settings.monthlyBudget !== undefined) {
    return parseFloat(settings.monthlyBudget);
  }
  try { const localSaved = localStorage.getItem("thao_monthly_budget"); if (localSaved) return parseFloat(localSaved); }
  catch { /* noop */ }
  return DEFAULT_BUDGET_VND;
}

export function updateBudgetUI() {
  const vndVal = getRawBudgetVND();
  const input = document.getElementById("monthly-budget-input");
  if (!input) return;
  if (document.activeElement === input && input.dataset.month == state.activeMonthId) return;
  input.dataset.raw = vndVal;
  input.dataset.month = state.activeMonthId;
  input.value = formatDisplay(vndVal);
}

export function saveBudgetAndCalculate() {
  const inputEl = document.getElementById("monthly-budget-input");
  if (!inputEl) return;
  let rawInput = inputEl.value.replace(/,/g, "");
  if (!rawInput) return;
  let val = safeEval(rawInput);
  let vndVal = val;
  if (state.currentCurrency === "CNY") vndVal = val * getActiveRate();
  if (!state.appState.settings) state.appState.settings = {};
  state.appState.settings.monthlyBudget = vndVal;
  state.appState.settings["budget_" + state.activeMonthId] = vndVal;
  inputEl.dataset.raw = vndVal;
  inputEl.dataset.month = state.activeMonthId;
  inputEl.value = formatDisplay(vndVal);
  try { localStorage.setItem("thao_monthly_budget", vndVal); } catch { /* noop */ }
  if (!state.pendingUpdates.settings) state.pendingUpdates.settings = {};
  state.pendingUpdates.settings.monthlyBudget = vndVal;
  state.pendingUpdates.settings["budget_" + state.activeMonthId] = vndVal;
  triggerCloudSave();
  calculateAll();
}

export function updateBudgetProgress() {
  const targetBudgetVND = getRawBudgetVND();
  const targetBudget = state.currentCurrency === "VND" ? targetBudgetVND : targetBudgetVND / getActiveRate();
  let currentMonthExp = 0;
  if (state.monthlyCatSums[state.activeMonthId]) {
    currentMonthExp = Object.values(state.monthlyCatSums[state.activeMonthId]).reduce((a, b) => a + b, 0);
  }
  const displayExp = state.currentCurrency === "VND" ? currentMonthExp : currentMonthExp / getActiveRate();
  let pct = targetBudget > 0 ? (displayExp / targetBudget) * 100 : 0;
  const bar = document.getElementById("budget-progress-bar");
  const txt = document.getElementById("budget-text");
  if (!bar || !txt) return;
  let widthPct = Math.min(pct, 100);
  bar.style.width = widthPct + "%";
  if (pct >= 90) { bar.className = "progress-bar danger"; }
  else if (pct >= 75) { bar.className = "progress-bar warning"; }
  else { bar.className = "progress-bar"; }
  txt.className = "budget-tip-text";

  // Smart budget tips
  var today = new Date();
  var daysInMonth = new Date(state.activeYear, state.activeMonthId, 0).getDate();
  var remainingDays = Math.max(0, daysInMonth - today.getDate() + (state.activeYear === today.getFullYear() && state.activeMonthId === today.getMonth() + 1 ? 0 : daysInMonth));
  if (state.activeYear !== today.getFullYear() || state.activeMonthId !== today.getMonth() + 1) {
    remainingDays = daysInMonth;
  }
  var remainingBudget = Math.max(0, targetBudget - displayExp);
  var dailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : 0;
  var currencySymbol = state.currentCurrency === "VND" ? "₫" : "¥";
  var dailyStr = dailyBudget >= 1000 ? Math.round(dailyBudget).toLocaleString("en-US") : dailyBudget.toFixed(2);

  var pctVal = pct.toFixed(1);
  var pctColor = pct >= 90 ? "#dc2626" : pct >= 75 ? "#d97706" : "#059669";
  var tipHtml = '已用 <span class="budget-num" style="color:' + pctColor + '">' + pctVal + '%</span>';
  if (remainingDays > 0 && pct < 100) {
    tipHtml += ' · 剩<span class="budget-num" style="color:#6366f1">' + remainingDays + '</span>天';
    if (dailyBudget > 0) {
      tipHtml += ' · 日均可用 <span class="budget-num" style="color:#d97706">' + currencySymbol + dailyStr + '</span>';
    }
  }
  txt.innerHTML = tipHtml;
}

export function calculateAll() {
  const monthsData = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, days: new Date(state.activeYear, i + 1, 0).getDate() }));
  let globalTotalIncome = 0, globalTotalExpense = 0;
  state.yearlyCatSums = {};
  expenseCategories.forEach((c) => (state.yearlyCatSums[c.id] = 0));

  monthsData.forEach((month) => {
    let mExp = 0, mInc = 0;
    let mCatSums = {};
    expenseCategories.forEach((c) => (mCatSums[c.id] = 0));

    for (let d = 1; d <= month.days; d++) {
      let dExp = 0;
      expenseCategories.forEach((cat) => {
        const val = safeEval(state.appState.entries[month.id + "_" + d + "_" + cat.id]);
        dExp += val;
        mCatSums[cat.id] += val;
      });
      mExp += dExp;
      mInc += safeEval(state.appState.entries[month.id + "_" + d + "_income"]);

      if (month.id === state.activeMonthId) {
        const dayExpEl = document.getElementById("total-exp-" + month.id + "-" + d);
        if (dayExpEl) dayExpEl.value = formatDisplay(dExp);
      }
    }

    state.monthlyCatSums[month.id] = mCatSums;
    globalTotalExpense += mExp;
    globalTotalIncome += mInc;
    expenseCategories.forEach((c) => (state.yearlyCatSums[c.id] += mCatSums[c.id]));

    if (month.id === state.activeMonthId) {
      expenseCategories.forEach((cat) => {
        const sumEl = document.getElementById("sum-" + month.id + "-" + cat.id);
        if (sumEl) sumEl.innerText = formatDisplay(mCatSums[cat.id]);
      });
      const elExp = document.getElementById("sum-" + month.id + "-exp");
      if (elExp) elExp.innerText = formatDisplay(mExp);
      const elInc = document.getElementById("sum-" + month.id + "-inc");
      if (elInc) elInc.innerText = formatDisplay(mInc);
      const elBal = document.getElementById("summary-balance-" + month.id);
      if (elBal) {
        var bal = mInc - mExp;
        elBal.innerText = formatSymbol(bal);
        elBal.style.color = bal > 0 ? "#dc2626" : bal < 0 ? "#059669" : "#64748b";
      }

      const sidebarInc = document.getElementById("sidebar-monthly-inc");
      if (sidebarInc) sidebarInc.innerText = formatSymbol(mInc);
      const sidebarExp = document.getElementById("sidebar-monthly-exp");
      if (sidebarExp) sidebarExp.innerText = formatSymbol(mExp);
      const sidebarBal = document.getElementById("sidebar-monthly-bal");
      if (sidebarBal) sidebarBal.innerText = formatSymbol(mInc - mExp);
    }
  });

  updateBudgetProgress();
  updateGlobalStats(globalTotalIncome, globalTotalExpense);
  updateCharts();
}

function updateGlobalStats(inc, exp) {
  const initialAssets = ["bal-bank", "bal-alipay", "bal-wechat", "bal-other"].reduce((sum, id) => sum + safeEval(state.appState.balances[id]), 0);
  const elInit = document.getElementById("global-initial-assets");
  if (elInit) elInit.innerText = formatSymbol(initialAssets);

  const globalBalance = inc - exp;
  const theoreticalAssets = initialAssets + globalBalance;

  const elInc = document.getElementById("global-income");
  if (elInc) elInc.innerText = formatSymbol(inc);
  const elExp = document.getElementById("global-expense");
  if (elExp) elExp.innerText = formatSymbol(exp);
  const elBal = document.getElementById("global-balance");
  if (elBal) elBal.innerText = formatSymbol(globalBalance);
  const elCurr = document.getElementById("global-current-assets");
  if (elCurr) elCurr.innerText = formatSymbol(theoreticalAssets);

  const actualAssets = ["end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"].reduce((sum, id) => sum + safeEval(state.appState.balances[id]), 0);
  const elActual = document.getElementById("global-actual-assets");
  if (elActual) elActual.innerText = formatSymbol(actualAssets);

  // 对账差异 = 实际盘点 - 理论资产
  const reconDiff = actualAssets - theoreticalAssets;
  const elDiff = document.getElementById("global-recon-diff");
  const elLabel = document.getElementById("global-recon-label");
  if (elDiff) {
    elDiff.innerText = formatSymbol(reconDiff);
    if (reconDiff > 0) {
      elDiff.style.color = "#dc2626";
      if (elLabel) elLabel.innerText = "盘盈 · 实际多于账面";
    } else if (reconDiff < 0) {
      elDiff.style.color = "#059669";
      if (elLabel) elLabel.innerText = "盘亏 · 可能有漏记";
    } else {
      elDiff.style.color = "#64748b";
      if (elLabel) elLabel.innerText = "完全平账 ✓";
    }
  }
}