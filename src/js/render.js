import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday } from "./clock.js";
import { safeEval, formatDisplay } from "./utils.js";
import { calculateAll } from "./budget.js";
import { t } from "./i18n.js";
import { renderDailyLedger } from "./render/daily.js";

export { renderDailyLedger };
export { renderStreakPanel, updateStreakAfterRecord } from "./render/streak.js";

export function fullRebuildDOM() {
  ["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"].forEach(function(id) {
    updateDOMFromState(id, state.appState.balances[id]);
  });
  renderMonthTable(state.activeMonthId);
  renderDailyLedger(state.activeMonthId);
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
  renderDailyLedger(state.activeMonthId);
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
      cellsHtml += '<td><input type="text" id="entry-' + monthId + '-' + d + '-' + cat.id + '" data-type="entry" data-key="' + key + '" class="cell-input" value="" data-raw="" placeholder="·" aria-label="' + t("date") + ' ' + monthId + '/' + d + ' ' + t(cat.nameKey) + '"></td>';
    });

    var incomeKey = monthId + "_" + d + "_income";
    var remarkKey = monthId + "_" + d + "_remark";

    rowsHtml += '<tr id="row-' + monthId + '-' + d + '" class="' + rowClass + '">';
    rowsHtml += '<td class="sticky-col">' + monthId + '/' + d + '</td>';
    rowsHtml += cellsHtml;
    rowsHtml += '<td class="total-col"><input type="text" id="total-exp-' + monthId + '-' + d + '" class="cell-input total-exp-input" readonly placeholder="·" aria-label="' + t("date") + ' ' + monthId + '/' + d + ' ' + t("expense") + '"></td>';
    rowsHtml += '<td class="income-col"><input type="text" id="entry-' + monthId + '-' + d + '-income" data-type="entry" data-key="' + incomeKey + '" class="cell-input income-input" value="" data-raw="" placeholder="·" aria-label="' + t("date") + ' ' + monthId + '/' + d + ' ' + t("income") + '"></td>';
    rowsHtml += '<td class="remark-col"><input type="text" id="entry-' + monthId + '-' + d + '-remark" data-type="entry" data-key="' + remarkKey + '" class="cell-input remark-input" value="" data-raw="" placeholder="" aria-label="' + t("date") + ' ' + monthId + '/' + d + ' ' + t("remark") + '"></td>';
    rowsHtml += '</tr>';
  }

  // Summary footer cells
  var sumCellsHtml = "";
  expenseCategories.forEach(function(cat) {
    sumCellsHtml += '<td><span id="sum-' + monthId + '-' + cat.id + '" class="blur-sensitive">0</span></td>';
  });

  var tableHtml = '<div class="table-card">'
    // Budget inline bar — sits above the table header
    + '<div class="budget-inline-bar">'
    + '<div class="budget-inline-left">'
    + '<span data-icon="target" data-icon-class="w-4 h-4 text-[var(--color-accent)]"></span>'
    + '<span class="text-xs font-bold text-slate-600"><span id="budget-label-month">' + monthId + '</span> ' + t("budget") + '</span>'
    + '<input type="text" id="monthly-budget-input" class="budget-inline-input" placeholder="15,000,000" aria-label="' + t("budget") + '" onchange="window.saveBudgetAndCalculate()">'
    + '<span class="text-xs text-slate-400 font-medium shrink-0" id="qa-currency-badge">VND</span>'
    + '</div>'
    + '<div class="budget-inline-right">'
    + '<div class="bg-[var(--color-surface-secondary)] rounded-full h-2.5 overflow-hidden flex-1" style="min-width:80px;"><div id="budget-progress-bar" class="progress-bar h-full" style="width:0%"></div></div>'
    + '<div id="budget-text" class="text-xs text-slate-500 font-medium">' + t("used") + ' 0%</div>'
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
    + '<td class="sticky-col">' + t("total") + '</td>'
    + sumCellsHtml
    + '<td class="total-col"><span id="sum-' + monthId + '-exp" class="blur-sensitive total-exp-sum">0</span></td>'
    + '<td class="income-col"><span id="sum-' + monthId + '-inc" class="blur-sensitive income-sum">0</span></td>'
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
