import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday } from "./clock.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { calculateAll } from "./budget.js";
import { Icons } from "./icons.js";
import { Fireworks } from "./fireworks.js";
import { buildLegacyStreak } from "./streak.js";
import { t } from "./i18n.js";

export function fullRebuildDOM() {
  ["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"].forEach(function(id) {
    updateDOMFromState(id, state.appState.balances[id]);
  });
  renderMonthTable(state.activeMonthId);
  calculateAll();
}

export function softUpdateDOM() {
  ["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"].forEach(function(id) {
    updateDOMFromState(id, state.appState.balances[id]);
  });
  var monthDays = getDaysInMonth(state.activeYear, state.activeMonthId);
  for (var d = 1; d <= monthDays; d++) {
    expenseCategories.forEach(function(cat) {
      updateDOMFromState("entry-" + state.activeMonthId + "-" + d + "-" + cat.id, state.appState.entries[state.activeMonthId + "_" + d + "_" + cat.id]);
    });
    updateDOMFromState("entry-" + state.activeMonthId + "-" + d + "-income", state.appState.entries[state.activeMonthId + "_" + d + "_income"]);
    updateDOMFromState("entry-" + state.activeMonthId + "-" + d + "-remark", state.appState.entries[state.activeMonthId + "_" + d + "_remark"], false);
  }
  calculateAll();
}

export function updateDOMFromState(id, rawVNDVal, isMath) {
  if (isMath === undefined) isMath = true;
  var el = document.getElementById(id);
  if (!el) return;
  if (document.activeElement === el) return;
  var newRawVND = rawVNDVal === undefined || rawVNDVal === null ? "" : String(rawVNDVal);
  el.dataset.raw = newRawVND;
  if (isMath) el.value = newRawVND ? formatDisplay(safeEval(newRawVND)) : "";
  else { el.value = newRawVND; if (el.hasAttribute("title")) el.title = newRawVND; }
}

export function renderMonthTable(monthId) {
  var container = document.getElementById("months-container");
  if (!container) return;
  var monthDays = getDaysInMonth(state.activeYear, monthId);
  var today = getLedgerToday();
  var isCurrentMonth = today.year === state.activeYear && today.month === monthId;
  var currentDay = today.day;

  // Category column headers — emoji icon + abbreviated name
  var catHeaders = "";
  expenseCategories.forEach(function(c) {
    catHeaders += '<th>' + c.emoji + ' ' + t(c.nameKey) + '</th>';
  });

  // Build data rows
  var rowsHtml = "";
  for (var d = 1; d <= monthDays; d++) {
    var isToday = isCurrentMonth && d === currentDay;
    var rowClass = isToday ? "row-today" : "";

    var cellsHtml = "";
    expenseCategories.forEach(function(cat) {
      var key = monthId + "_" + d + "_" + cat.id;
      cellsHtml += '<td><input type="text" id="entry-' + monthId + '-' + d + '-' + cat.id + '" data-type="entry" data-key="' + key + '" class="cell-input" value="" data-raw="" placeholder="·"></td>';
    });

    var incomeKey = monthId + "_" + d + "_income";
    var remarkKey = monthId + "_" + d + "_remark";

    rowsHtml += '<tr id="row-' + monthId + '-' + d + '" class="' + rowClass + '">';
    rowsHtml += '<td class="sticky-col">' + monthId + '/' + d + '</td>';
    rowsHtml += cellsHtml;
    rowsHtml += '<td class="total-col"><input type="text" id="total-exp-' + monthId + '-' + d + '" class="cell-input total-exp-input" readonly placeholder="·"></td>';
    rowsHtml += '<td class="income-col"><input type="text" id="entry-' + monthId + '-' + d + '-income" data-type="entry" data-key="' + incomeKey + '" class="cell-input income-input" value="" data-raw="" placeholder="·"></td>';
    rowsHtml += '<td class="remark-col"><input type="text" id="entry-' + monthId + '-' + d + '-remark" data-type="entry" data-key="' + remarkKey + '" class="cell-input remark-input" value="" data-raw="" placeholder=""></td>';
    rowsHtml += '</tr>';
  }

  // Summary footer cells
  var sumCellsHtml = "";
  expenseCategories.forEach(function(cat) {
    sumCellsHtml += '<td><span id="sum-' + monthId + '-' + cat.id + '">0</span></td>';
  });

  var tableHtml = '<div class="table-card">'
    // Budget inline bar — sits above the table header
    + '<div class="budget-inline-bar">'
    + '<div class="budget-inline-left">'
    + '<span data-icon="target" data-icon-class="w-4 h-4 text-amber-500"></span>'
    + '<span class="text-xs font-bold text-slate-600"><span id="budget-label-month">' + monthId + '</span>' + t("monthly_budget", { month: monthId }) + '</span>'
    + '<input type="text" id="monthly-budget-input" class="budget-inline-input" placeholder="15,000,000" onchange="window.saveBudgetAndCalculate()">'
    + '<span class="text-xs text-slate-400 font-medium shrink-0" id="qa-currency-badge">VND</span>'
    + '</div>'
    + '<div class="budget-inline-right">'
    + '<div class="bg-slate-100 rounded-full h-2.5 overflow-hidden flex-1" style="min-width:80px;"><div id="budget-progress-bar" class="progress-bar h-full" style="width:0%"></div></div>'
    + '<div id="budget-text" class="text-xs text-slate-500 font-medium whitespace-nowrap">' + t("used") + ' 0%</div>'
    + '</div>'
    + '</div>'
    // Table header bar
    + '<div class="table-header-bar">'
    + '<h2 class="table-title">' + t("year_month_title", { year: state.activeYear, month: monthId }) + '</h2>'
    + '<div class="table-balance-badge">' + t("balance") + ' <span id="summary-balance-' + monthId + '" class="blur-sensitive">0</span></div>'
    + '</div>'
    // Scrollable table body
    + '<div class="table-scroll" id="table-scroll-container-' + monthId + '">'
    + '<table>'
    + '<thead><tr>'
    + '<th class="sticky-col date-col">' + t("date") + '</th>'
    + catHeaders
    + '<th class="total-th">' + t("expense") + '</th>'
    + '<th class="income-th">' + t("income") + '</th>'
    + '<th class="remark-th">' + t("remark") + '</th>'
    + '</tr></thead>'
    + '<tbody>' + rowsHtml + '</tbody>'
    + '<tfoot><tr>'
    + '<td class="sticky-col">合计</td>'
    + sumCellsHtml
    + '<td class="total-col"><span id="sum-' + monthId + '-exp" style="color:#10b981;font-weight:700;">0</span></td>'
    + '<td class="income-col"><span id="sum-' + monthId + '-inc" style="color:#ef4444;font-weight:700;">0</span></td>'
    + '<td></td>'
    + '</tr></tfoot>'
    + '</table>'
    + '</div></div>';

  container.innerHTML = tableHtml;

  // Assign untrusted ledger values through DOM properties, never HTML strings.
  for (var inputDay = 1; inputDay <= monthDays; inputDay++) {
    expenseCategories.forEach(function(cat) {
      var entryKey = monthId + "_" + inputDay + "_" + cat.id;
      updateDOMFromState("entry-" + monthId + "-" + inputDay + "-" + cat.id, state.appState.entries[entryKey]);
    });
    updateDOMFromState("entry-" + monthId + "-" + inputDay + "-income", state.appState.entries[monthId + "_" + inputDay + "_income"]);
    updateDOMFromState("entry-" + monthId + "-" + inputDay + "-remark", state.appState.entries[monthId + "_" + inputDay + "_remark"], false);
  }

  var monthlyChartTitle = document.getElementById("monthly-chart-title");
  if (monthlyChartTitle) monthlyChartTitle.innerText = t("monthly", { month: monthId });

  // Auto-scroll to today's row (只对当前月份生效)
  if (isCurrentMonth) {
    requestAnimationFrame(function() {
      var todayRow = document.getElementById("row-" + monthId + "-" + currentDay);
      var scrollContainer = document.getElementById("table-scroll-container-" + monthId);
      if (todayRow && scrollContainer) {
        scrollContainer.scrollTo({ top: todayRow.offsetTop - 80, behavior: "smooth" });
      }
    });
  }
}

// ---- streak helpers ----

function getDerivedStreak() {
  return buildLegacyStreak(state.appState.entries, state.activeYear, new Date(), "Asia/Ho_Chi_Minh", {
    previousYearEntries: state.previousYearEntries,
  });
}

function hasRewardFired(threshold, todayStr) {
  try { return localStorage.getItem("expense_streak_reward_" + threshold + "_" + todayStr) === "1"; }
  catch (e) { return false; }
}

function markRewardFired(threshold, todayStr) {
  try { localStorage.setItem("expense_streak_reward_" + threshold + "_" + todayStr, "1"); }
  catch (e) {}
}

// ---- render ----

export function renderStreakPanel() {
  var panel = document.getElementById("streak-panel");
  if (!panel) return;
  var s = getDerivedStreak();

  panel.innerHTML = '<div class="card p-4">'
    + '<div class="flex items-center justify-between">'
    + '<div class="flex items-center gap-3">'
    + '<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/60">' + Icons.flame('w-7 h-7 text-white') + '</div>'
    + '<div><div class="text-xs text-slate-500 dark:text-slate-400 font-medium">' + t("streak_days") + '</div>'
    + '<div class="text-2xl font-black text-slate-800 dark:text-white">' + s.streak + ' <span class="text-sm font-normal text-slate-500 dark:text-slate-400">' + t("streak_unit") + '</span></div></div></div>'
    + '<div class="text-right">'
    + (s.hasRecordedToday ? '<span class="streak-badge">' + Icons.check('w-3.5 h-3.5') + t("checked_in_today") + '</span>' : '<span class="text-xs text-slate-400 dark:text-slate-500">' + t("not_recorded_yet") + '</span>')
    + '</div></div>'
    + (s.streak >= 7 ? '<div class="mt-3 pt-3 border-t border-slate-100"><p class="text-xs text-amber-600 font-medium flex items-center gap-1">' + Icons.flame('w-4 h-4') + t("streak_encouragement", { days: s.streak }) + '</p></div>' : '')
    + '</div>';

  state.currentStreak = s.streak;
  return s;
}

export function updateStreakAfterRecord(options) {
  options = options || {};
  var launchDefaultFireworks = options.launchDefaultFireworks !== false;
  var s = renderStreakPanel();
  if (!s || !s.hasRecordedToday) {
    return;
  }

  if ((s.streak === 7 || s.streak === 30) && !hasRewardFired(s.streak, s.todayStr)) {
    markRewardFired(s.streak, s.todayStr);
    showToast(t("streak_achieved", { days: s.streak }));
    Fireworks.launch({ duration: 12000 });
  } else if (launchDefaultFireworks) {
    Fireworks.launch({ duration: 6000 });
  }
}
