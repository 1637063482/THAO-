import { state } from "../state.js";
import { expenseCategories, getDaysInMonth } from "../config.js";
import { formatDisplay } from "../utils.js";
import { t } from "../i18n.js";
import { buildDailyLedger, getLedgerView } from "../day-ledger.js";

export function renderDailyLedger(monthId) {
  var container = document.getElementById("daily-ledger-container");
  var tableContainer = document.getElementById("months-container");
  if (!container) return;
  var activeElement = document.activeElement;
  var activeKey = container.contains(activeElement) && activeElement.dataset ? activeElement.dataset.key : null;
  var activeDraft = activeKey ? { value: activeElement.value, raw: activeElement.dataset.raw } : null;
  var categories = expenseCategories.map(function(cat) { return { id: cat.id, label: t(cat.nameKey || cat.name) }; });
  var result = buildDailyLedger({ year: state.activeYear, month: monthId, entries: state.appState.entries, categories: categories, daysInMonth: getDaysInMonth(state.activeYear, monthId) });
  var view = getLedgerView();
  container.classList.toggle("ledger-view-active", view === "daily");
  if (tableContainer) tableContainer.classList.toggle("ledger-table-hidden", view === "daily");
  if (result.empty) { container.innerHTML = '<div class="card p-6 text-center text-slate-400 text-sm">' + t("no_data") + '</div>'; return; }
  var html = '';
  result.days.forEach(function(day) {
    html += '<article class="daily-ledger-card card p-4"><div class="flex items-center justify-between mb-3"><h3 class="font-bold text-slate-700">' + day.dateKey + '</h3><span class="text-xs text-slate-500">' + t("expense") + ' ' + formatDisplay(day.expenseTotal) + '</span></div><div class="grid grid-cols-2 gap-2">';
    day.cells.forEach(function(cell) { html += '<label class="daily-ledger-cell"><span class="text-xs text-slate-500">' + cell.label + '</span><input class="cell-input daily-ledger-input" data-type="entry" data-key="' + cell.sourceKey + '" value="' + formatDisplay(cell.value) + '" data-raw="' + cell.value + '"></label>'; });
    html += '<label class="daily-ledger-cell"><span class="text-xs text-slate-500">' + t("income_total") + '</span><input class="cell-input daily-ledger-input income-input" data-type="entry" data-key="' + monthId + '_' + day.day + '_income" value="' + (day.income ? formatDisplay(day.income) : '') + '" data-raw="' + (day.income || '') + '"></label></div>';
    if (day.remark) html += '<p data-day="' + day.day + '" class="daily-ledger-remark text-xs text-slate-500 mt-3"></p>';
    html += '</article>';
  });
  container.innerHTML = html;
  result.days.forEach(function(day) {
    if (!day.remark) return;
    var remark = container.querySelector('.daily-ledger-remark[data-day="' + day.day + '"]');
    if (remark) remark.textContent = day.remark;
  });
  if (activeKey) {
    var activeInput = container.querySelector('[data-key="' + activeKey + '"]');
    if (activeInput) {
      if (activeDraft) { activeInput.value = activeDraft.value; activeInput.dataset.raw = activeDraft.raw || activeDraft.value; }
      activeInput.focus(); activeInput.selectionStart = activeInput.value.length;
    }
  }
}
