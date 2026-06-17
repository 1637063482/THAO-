import { state } from "./state.js";
import { expenseCategories, getDaysInMonth, TODAY, CURRENT_MONTH, CURRENT_DAY } from "./config.js";
import { safeEval, formatDisplay, getActiveRate, showToast } from "./utils.js";
import { calculateAll } from "./budget.js";
import { Icons } from "./icons.js";
import { Fireworks } from "./fireworks.js";

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
  var isCurrentMonth = TODAY.getFullYear() === state.activeYear && TODAY.getMonth() + 1 === monthId;
  var currentDay = TODAY.getDate();

  // Category column headers — emoji icon + abbreviated name
  var catHeaders = "";
  expenseCategories.forEach(function(c) {
    catHeaders += '<th>' + c.emoji + ' ' + c.name + '</th>';
  });

  // Build data rows
  var rowsHtml = "";
  for (var d = 1; d <= monthDays; d++) {
    var isToday = isCurrentMonth && d === currentDay;
    var rowClass = isToday ? "row-today" : "";

    var cellsHtml = "";
    expenseCategories.forEach(function(cat) {
      var key = monthId + "_" + d + "_" + cat.id;
      var raw = state.appState.entries[key] || "";
      var displayVal = raw ? formatDisplay(safeEval(raw)) : "";
      cellsHtml += '<td><input type="text" id="entry-' + monthId + '-' + d + '-' + cat.id + '" data-type="entry" data-key="' + key + '" class="cell-input" value="' + displayVal + '" data-raw="' + raw + '" placeholder="·"></td>';
    });

    var incomeKey = monthId + "_" + d + "_income";
    var incomeRaw = state.appState.entries[incomeKey] || "";
    var incomeDisplay = incomeRaw ? formatDisplay(safeEval(incomeRaw)) : "";

    var remarkKey = monthId + "_" + d + "_remark";
    var remarkVal = state.appState.entries[remarkKey] || "";

    rowsHtml += '<tr id="row-' + monthId + '-' + d + '" class="' + rowClass + '">';
    rowsHtml += '<td class="sticky-col">' + monthId + '/' + d + '</td>';
    rowsHtml += cellsHtml;
    rowsHtml += '<td class="total-col"><input type="text" id="total-exp-' + monthId + '-' + d + '" class="cell-input total-exp-input" readonly placeholder="·"></td>';
    rowsHtml += '<td class="income-col"><input type="text" id="entry-' + monthId + '-' + d + '-income" data-type="entry" data-key="' + incomeKey + '" class="cell-input income-input" value="' + incomeDisplay + '" data-raw="' + incomeRaw + '" placeholder="·"></td>';
    rowsHtml += '<td class="remark-col"><input type="text" id="entry-' + monthId + '-' + d + '-remark" data-type="entry" data-key="' + remarkKey + '" class="cell-input remark-input" value="' + remarkVal + '" data-raw="' + remarkVal + '" placeholder=""></td>';
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
    + '<span class="text-xs font-bold text-slate-600"><span id="budget-label-month">' + monthId + '</span>月预算</span>'
    + '<input type="text" id="monthly-budget-input" class="budget-inline-input" placeholder="15,000,000" onchange="window.saveBudgetAndCalculate()">'
    + '<span class="text-xs text-slate-400 font-medium shrink-0" id="qa-currency-badge">VND</span>'
    + '</div>'
    + '<div class="budget-inline-right">'
    + '<div class="bg-slate-100 rounded-full h-2.5 overflow-hidden flex-1" style="min-width:80px;"><div id="budget-progress-bar" class="progress-bar h-full" style="width:0%"></div></div>'
    + '<div id="budget-text" class="text-xs text-slate-500 font-medium whitespace-nowrap">已用 0%</div>'
    + '</div>'
    + '</div>'
    // Table header bar
    + '<div class="table-header-bar">'
    + '<h2 class="table-title">' + state.activeYear + '年' + monthId + '月</h2>'
    + '<div class="table-balance-badge">结余 <span id="summary-balance-' + monthId + '" class="blur-sensitive">0</span></div>'
    + '</div>'
    // Scrollable table body
    + '<div class="table-scroll" id="table-scroll-container-' + monthId + '">'
    + '<table>'
    + '<thead><tr>'
    + '<th class="sticky-col date-col">日期</th>'
    + catHeaders
    + '<th class="total-th">支出</th>'
    + '<th class="income-th">收入</th>'
    + '<th class="remark-th">备注</th>'
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

  var monthlyChartTitle = document.getElementById("monthly-chart-title");
  if (monthlyChartTitle) monthlyChartTitle.innerText = monthId + "月";

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

function getDateStrings() {
  var today = new Date();
  var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + "-" + String(yesterday.getMonth() + 1).padStart(2, "0") + "-" + String(yesterday.getDate()).padStart(2, "0");
  return { todayStr: todayStr, yesterdayStr: yesterdayStr };
}

/**
 * 读取并校准 streak 状态（读写 localStorage，保证一致性）
 * 返回 { streak, hasRecordedToday }
 */
function getCalibratedStreak() {
  var dates = getDateStrings();
  var lastDate = "";
  var streak = 0;
  try { lastDate = localStorage.getItem("expense_last_date") || ""; } catch (e) {}
  try { streak = parseInt(localStorage.getItem("expense_streak") || "0"); } catch (e) {}

  // 超过一天未记账 → streak 归零，同步回 localStorage
  if (lastDate !== dates.todayStr && lastDate !== dates.yesterdayStr) {
    streak = 0;
    try { localStorage.setItem("expense_streak", "0"); } catch (e) {}
  }

  return {
    streak: streak,
    hasRecordedToday: lastDate === dates.todayStr
  };
}

/**
 * 记账后更新 streak（必须已确认今天还没记过）
 */
function incrementStreak() {
  var dates = getDateStrings();
  var lastDate = "";
  var streak = 0;
  try { lastDate = localStorage.getItem("expense_last_date") || ""; } catch (e) {}
  try { streak = parseInt(localStorage.getItem("expense_streak") || "0"); } catch (e) {}

  if (lastDate === dates.yesterdayStr) {
    streak += 1;
  } else {
    streak = 1;
  }

  try {
    localStorage.setItem("expense_streak", String(streak));
    localStorage.setItem("expense_last_date", dates.todayStr);
  } catch (e) {}
  return streak;
}

// ---- render ----

export function renderStreakPanel() {
  var panel = document.getElementById("streak-panel");
  if (!panel) return;
  var s = getCalibratedStreak();

  panel.innerHTML = '<div class="card p-4">'
    + '<div class="flex items-center justify-between">'
    + '<div class="flex items-center gap-3">'
    + '<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-200/60">' + Icons.flame('w-7 h-7 text-white') + '</div>'
    + '<div><div class="text-xs text-slate-500 font-medium">记账连续天数</div>'
    + '<div class="text-2xl font-black text-slate-800">' + s.streak + ' <span class="text-sm font-normal text-slate-500">天</span></div></div></div>'
    + '<div class="text-right">'
    + (s.hasRecordedToday ? '<span class="streak-badge">' + Icons.check('w-3.5 h-3.5') + '今日已打卡</span>' : '<span class="text-xs text-slate-400">THAO，今天还没记账哦~</span>')
    + '</div></div>'
    + (s.streak >= 7 ? '<div class="mt-3 pt-3 border-t border-slate-100"><p class="text-xs text-amber-600 font-medium flex items-center gap-1">' + Icons.flame('w-4 h-4') + '太棒了！THAO！你已经坚持了 ' + s.streak + ' 天，继续保持！</p></div>' : '')
    + '</div>';

  state.currentStreak = s.streak;
}

export function updateStreakAfterRecord() {
  var dates = getDateStrings();
  var lastDate = "";
  try { lastDate = localStorage.getItem("expense_last_date") || ""; } catch (e) {}

  var isFirstToday = (lastDate !== dates.todayStr);
  var newStreak = state.currentStreak;

  if (isFirstToday) {
    // 今天首次记账 → 更新 streak
    newStreak = incrementStreak();
    state.currentStreak = newStreak;
    renderStreakPanel();
  }

  // 🎆 烟花：每次记账都触发（不受 streak 限制）
  if (isFirstToday && (newStreak === 7 || newStreak === 30)) {
    showToast("恭喜！连续记账" + newStreak + "天成就达成！");
    Fireworks.launch({ duration: 12000 });
  } else {
    Fireworks.launch({ duration: 6000 });
  }
}