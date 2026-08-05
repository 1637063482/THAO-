/**
 * Dashboard — spending-awareness home page component.
 *
 * Renders the dashboard ViewModel into the DOM and wires up interactions.
 * Uses buildDashboardViewModel() from dashboard-view-model.js for data.
 */

import { t, getCurrentLocale } from "./i18n.js";
import { state } from "./state.js";
import { getLedgerStreakDate, getLedgerToday } from "./clock.js";
import { formatDisplay } from "./utils.js";
import { buildDashboardViewModel } from "./dashboard-view-model.js";

const dashboardLabels = {
  vi: {
    budget_remaining: "Số dư có thể chi trong tháng", budget_of: "trên tổng ngân sách",
    today_spending: "Chi tiêu hôm nay", month_spending: "Chi tiêu tháng này",
    month_income: "Thu nhập tháng này", top_categories: "Hạng mục chi tiêu nhiều nhất",
    recent_entries: "Ghi chép gần đây", recent_entries_note: "Tổng hợp theo ngày và hạng mục, không phải từng giao dịch riêng lẻ",
  },
  "zh-CN": {
    budget_remaining: "本月可花余额", budget_of: "总预算", today_spending: "今日支出",
    month_spending: "本月支出", month_income: "本月收入", top_categories: "支出最多类别",
    recent_entries: "最近记录", recent_entries_note: "按日/分类汇总，非逐笔交易",
  },
};

function dashboardText(key) {
  var locale = getCurrentLocale();
  return dashboardLabels[locale]?.[key] || dashboardLabels.vi[key];
}

/**
 * Render the dashboard HTML from a ViewModel object.
 * @param {object} vm - ViewModel from buildDashboardViewModel()
 * @returns {string} HTML string
 */
export function renderDashboard(vm) {
  if (vm.noData) {
    return '<div class="dashboard-root no-data"><p class="text-slate-400 text-sm">' + t("no_data") + '</p></div>';
  }

  // Hero: budget remaining
  var heroAmount = formatDisplay(vm.budgetRemaining);
  var heroClass = vm.isOverBudget ? "dashboard-budget-value over-budget" : "dashboard-budget-value";

  var heroHtml = '<div class="dashboard-hero card p-6 mb-4 text-center">'
    + '<p class="text-sm text-slate-500 mb-1">' + dashboardText("budget_remaining") + '</p>'
    + '<p class="text-4xl font-black ' + heroClass + ' blur-sensitive">' + heroAmount + '</p>'
    + '<p class="text-xs text-slate-400 mt-1">' + dashboardText("budget_of") + ' ' + formatDisplay(vm.budgetVnd) + '</p>'
    + '</div>';

  // Stats row
  var statsHtml = '<div class="grid grid-cols-2 gap-3 mb-4">'
    + '<div class="card p-4 text-center"><p class="text-xs text-slate-500">' + dashboardText("today_spending") + '</p><p class="text-xl font-bold dashboard-expense-value blur-sensitive">' + formatDisplay(vm.todaySpending) + '</p></div>'
    + '<div class="card p-4 text-center"><p class="text-xs text-slate-500">' + dashboardText("month_spending") + '</p><p class="text-xl font-bold dashboard-expense-value blur-sensitive">' + formatDisplay(vm.totalSpending) + '</p></div>'
    + '<div class="card p-4 text-center"><p class="text-xs text-slate-500">' + dashboardText("month_income") + '</p><p class="text-xl font-bold dashboard-income-value blur-sensitive">' + formatDisplay(vm.totalIncome) + '</p></div>'
    + '<div class="card p-4 text-center"><p class="text-xs text-slate-500">' + t("streak_days") + '</p><p class="text-xl font-bold text-slate-800">' + vm.streak.streak + ' <span class="text-sm font-normal text-slate-400">' + t("streak_unit") + '</span></p></div>'
    + '</div>';

  // Top categories
  var topHtml = '';
  if (vm.topCategories.length > 0) {
    topHtml = '<div class="card p-4 mb-4"><h3 class="text-sm font-bold text-slate-700 mb-3">' + dashboardText("top_categories") + '</h3>';
    vm.topCategories.forEach(function (cat) {
      topHtml += '<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">'
        + '<span class="text-sm">' + cat.emoji + ' ' + t(cat.label) + '</span>'
        + '<span class="text-sm font-semibold text-slate-700 blur-sensitive">' + formatDisplay(cat.spending) + '</span>'
        + '</div>';
    });
    topHtml += '</div>';
  }

  // Recent days
  var recentHtml = '';
  if (vm.days.length > 0) {
    recentHtml = '<div class="card p-4"><h3 class="text-sm font-bold text-slate-700 mb-3">' + dashboardText("recent_entries") + '</h3>';
    recentHtml += '<p class="text-xs text-slate-400 mb-2">' + dashboardText("recent_entries_note") + '</p>';
    vm.days.forEach(function (day) {
      recentHtml += '<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">'
        + '<span class="text-xs text-slate-500">' + day.dateKey + '</span>'
        + '<span class="text-sm font-semibold text-slate-700 blur-sensitive">' + formatDisplay(day.totalSpending) + '</span>'
        + '</div>';
    });
    recentHtml += '</div>';
  }

  return '<div class="dashboard-root">' + heroHtml + statsHtml + topHtml + recentHtml + '</div>';
}

/**
 * Initialize the dashboard: build the ViewModel and render into the DOM.
 * @param {string} [containerId] - DOM element ID to render into (default: "dashboard-root")
 */
export function initDashboard(containerId) {
  containerId = containerId || "dashboard-root";
  var container = document.getElementById(containerId);
  if (!container) return;

  var now = new Date();
  var today = getLedgerToday(now);
  var vm = buildDashboardViewModel({
    year: state.activeYear,
    month: state.activeMonthId,
    today: today.day,
    streakDate: getLedgerStreakDate(now),
    state: { appState: state.appState },
    previousYearEntries: state.previousYearEntries,
  });

  container.innerHTML = renderDashboard(vm);
  container.style.display = "";
}

export function refreshDashboard() {
  initDashboard();
}

export function refreshDashboardAfterLocalUpdate() {
  initDashboard();
}

export function refreshDashboardAfterMonthSwitch() {
  initDashboard();
}
