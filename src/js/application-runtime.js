import { resetLedgerYearState, state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday, getNextLedgerMidnightDelay } from "./clock.js";
import { safeEval, formatDisplay, formatSymbol, getActiveRate, setCurrencyGetter, setRateGetter, showToast } from "./utils.js";
import { formatVndForCurrencyInput, isValidCurrencyRate, parseCurrencyInputToVnd } from "./currency-view.js";
import { initAuth, handleLogin, logoutApp, refreshAutoRate, updateActivityTime } from "./auth.js";
import { setupRealtimeListener, teardownListener, triggerCloudSave, importData } from "./sync.js";
import { fullRebuildDOM, softUpdateDOM, renderDailyLedger, renderStreakPanel, updateStreakAfterRecord } from "./render.js";
import { setLedgerView, getLedgerView } from "./day-ledger.js";
import { calculateAll, updateBudgetUI, saveBudgetAndCalculate } from "./budget.js";
import { closeQuickAdd, openQuickAdd, queueLegacyIncomeOnce, refreshQuickAddAmountInput, submitQuickAdd } from "./quick-add.js";
import { initIcons } from "./icons.js";
import { buildLegacyCsv } from "./export.js";
import { t, setLocale, getCurrentLocale, applyI18n } from "./i18n.js";
import { initNavigation } from "./navigation.js";
import { bindCommands } from "./commands.js";
import { createAppRouter } from "../app/router.js";
import { renderHeader } from "../components/app-shell/header.js";
import { renderSidebar } from "../components/app-shell/sidebar.js";
import { renderBottomNav } from "../components/app-shell/bottom-nav.js";
import { bindCommandMenu, renderCommandMenu } from "../components/app-shell/command-menu.js";
import { initDashboard, refreshDashboardAfterLocalUpdate, refreshDashboardAfterMonthSwitch } from "./dashboard.js";
import { buildDashboardViewModel } from "./dashboard-view-model.js";
import { db, projectId } from "./firebase.js";
import { createDepositController } from "../features/deposits/controller.js";
import { createDepositDependencies } from "../features/deposits/dependencies.js";
import { createSavingsController } from "../features/savings/controller.js";
import { createLedgerController } from "../features/ledger/controller.js";
import { createLedgerInputController } from "../features/ledger/input-controller.js";
import { createLedgerYearController } from "../features/ledger/year-controller.js";

export function startApplication() {

var headerHost = document.querySelector("[data-app-header-host]");
if (headerHost) {
  renderHeader(headerHost);
  renderCommandMenu(headerHost.querySelector("[data-app-command-menu-host]"));
  bindCommandMenu(document);
}
var sidebarHost = document.querySelector("[data-app-sidebar-host]");
if (sidebarHost) renderSidebar(sidebarHost);
var bottomNavHost = document.querySelector("[data-app-bottom-nav-host]");
if (bottomNavHost) renderBottomNav(bottomNavHost);

window.switchCurrency = switchCurrency;
window.switchLanguage = switchLanguage;
window.changeFxMode = changeFxMode;
window.applyManualRate = applyManualRate;
window.togglePrivacy = togglePrivacy;
window.toggleDarkMode = toggleDarkMode;
window.toggleLedgerView = toggleLedgerView;
window.handleLogin = handleLogin;
window.logoutApp = logoutApp;
window.openQuickAdd = openQuickAdd;
window.closeQuickAdd = closeQuickAdd;
window.submitQuickAdd = submitQuickAdd;
window.saveBudgetAndCalculate = saveBudgetAndCalculate;
window.importData = importDataHandler;
window.shareApp = shareApp;
window.exportToCSV = exportToCSV;
window.calculateAll = calculateAll;

setCurrencyGetter(function() { return state.currentCurrency; });
setRateGetter(function() { return state.fxMode === "auto" ? state.fxRateAuto : state.fxRateManual; });

applyI18n();

// Sync language toggle buttons with persisted locale.
(function initLangButtons() {
  var locale = getCurrentLocale();
  if (locale !== "vi") {
    var btnVi = document.getElementById("btn-lang-vi");
    var btnZh = document.getElementById("btn-lang-zh");
    if (btnVi) btnVi.className = "month-tab";
    if (btnZh) btnZh.className = "month-tab active";
  }
})();

const depositController = createDepositController({
  ...createDepositDependencies({
    db,
    projectId,
    state,
    getToday: () => getLedgerToday().dateKey,
    getNextMidnightDelay: getNextLedgerMidnightDelay,
    getLocale: getCurrentLocale,
    queueLegacyInterest: queueLegacyIncomeOnce,
  }),
  formatMoney: formatSymbol,
});

const savingsController = createSavingsController({
  getSavingsState: () => ({ settings: state.appState.settings, pendingUpdates: state.pendingUpdates.settings, month: state.activeMonthId }),
  getLocale: getCurrentLocale,
  getDashboardViewModel: (month) => buildDashboardViewModel({ year: state.activeYear, month, state: { appState: state.appState } }),
  formatMoney: formatDisplay,
  triggerCloudSave,
});

const ledgerInputController = createLedgerInputController({
  state,
  root: document.body,
  windowRoot: window,
  getActiveRate,
  isValidCurrencyRate,
  parseCurrencyInputToVnd,
  formatVndForCurrencyInput,
  formatDisplay,
  evaluate: safeEval,
  updateActivity: updateActivityTime,
  triggerSave: triggerCloudSave,
  refreshCalculatedViews: calculateAll,
  refreshDashboard: refreshDashboardAfterLocalUpdate,
  updateStreak: updateStreakAfterRecord,
  showFxUnavailable: () => showToast(t("fx_unavailable"), true),
  getUnsavedWarning: () => t("unsaved_warning"),
});

let ledgerController;
const ledgerYearController = createLedgerYearController({
  state,
  documentRoot: document,
  getToday: getLedgerToday,
  isOnline: () => navigator.onLine,
  translate: t,
  showBlocked: message => showToast(message, true),
  resetYearState: resetLedgerYearState,
  resubscribe: () => ledgerController.restartSync(),
  switchMonth: month => ledgerController.switchMonth(month),
});

ledgerController = createLedgerController({
  state,
  documentRoot: document,
  windowRoot: window,
  inputController: ledgerInputController,
  yearController: ledgerYearController,
  sync: {
    start: callbacks => setupRealtimeListener(callbacks),
    stop: teardownListener,
  },
  clock: {
    getToday: getLedgerToday,
    getNextMidnightDelay: getNextLedgerMidnightDelay,
  },
  renderLedger: fullRebuildDOM,
  softRenderLedger: softUpdateDOM,
  renderStreak: renderStreakPanel,
  updateStreakFromSnapshot: updateStreakAfterRecord,
  refreshDashboardForMonth: refreshDashboardAfterMonthSwitch,
  refreshDashboard: initDashboard,
  refreshSavings: () => savingsController.update(),
  scheduleIcons: () => setTimeout(initIcons, 50),
  notifyDomRebuilt: () => window.dispatchEvent(new CustomEvent("app-dom-rebuilt")),
  translate: t,
});
ledgerController.mount();

// 页面浏览/交互刷新活跃计时（节流30秒，避免频繁写 localStorage）
(function initActivityTracking() {
  var _activityThrottle = 0;
  function onUserActivity() {
    var now = Date.now();
    if (now - _activityThrottle < 30000) return;
    _activityThrottle = now;
    if (state.currentUser) updateActivityTime();
  }
  document.addEventListener("click", onUserActivity, true);
  document.addEventListener("scroll", onUserActivity, true);
  document.addEventListener("keydown", onUserActivity, true);
})();

document.getElementById("quick-add-modal")?.addEventListener("click", function(e) {
  if (e.target === e.currentTarget) closeQuickAdd();
});

var LEDGER_LABELS = {
  vi: { table: "Bảng", daily: "Theo ngày" },
  "zh-CN": { table: "表格", daily: "按日" },
};

function updateLedgerToggleLabel() {
  var btn = document.getElementById("btn-toggle-ledger");
  if (!btn) return;
  var view = getLedgerView();
  var locale = getCurrentLocale();
  var labels = LEDGER_LABELS[locale] || LEDGER_LABELS.vi;
  btn.textContent = labels[view] || "";
}

function toggleLedgerView() {
  setLedgerView(getLedgerView() === "daily" ? "table" : "daily");
  renderDailyLedger(state.activeMonthId);
  updateLedgerToggleLabel();
}

function switchLanguage(locale) {
  if (setLocale(locale)) {
    var btnVi = document.getElementById("btn-lang-vi");
    var btnZh = document.getElementById("btn-lang-zh");
    if (btnVi) btnVi.className = locale === "vi" ? "month-tab active" : "month-tab";
    if (btnZh) btnZh.className = locale === "zh-CN" ? "month-tab active" : "month-tab";
    var emailInput = document.getElementById("auth-email");
    var pwdInput = document.getElementById("auth-password");
    if (emailInput) emailInput.placeholder = t("email");
    if (pwdInput) pwdInput.placeholder = t("password_placeholder");
    applyI18n();
    window.dispatchEvent(new CustomEvent("app-locale-rendered", { detail: { locale } }));
    updateLedgerToggleLabel();
    if (_chartsModule) _chartsModule.updateCharts();
  }
}

var _chartsModule = null;
var _chartsLoading = null;
function ensureCharts() {
  if (_chartsModule) {
    _chartsModule.updateCharts();
    return Promise.resolve(true);
  }
  if (!_chartsLoading) {
    _chartsLoading = import("./charts.js")
      .then(async function (charts) {
        if (!await charts.initCharts()) return false;
        _chartsModule = charts;
        charts.updateCharts();
        return true;
      })
      .catch(function () { return false; })
      .finally(function () { _chartsLoading = null; });
  }
  return _chartsLoading;
}

const appRouter = createAppRouter({
  root: document,
  lifecycle: {
    overview: { enter: notifyRouteEntered },
    savings: { enter: notifyRouteEntered },
    stats: { enter: ensureCharts },
  },
});

function notifyRouteEntered(event) {
  window.dispatchEvent(new CustomEvent("app-route-entered", { detail: event }));
}

function switchCurrency(curr) {
  state.currentCurrency = curr;
  var btnCny = document.getElementById("btn-curr-cny");
  var btnVnd = document.getElementById("btn-curr-vnd");
  if (btnVnd) btnVnd.className = curr === "VND" ? "month-tab active" : "month-tab";
  if (btnCny) btnCny.className = curr === "CNY" ? "month-tab active" : "month-tab";
  var qaBadge = document.getElementById("qa-currency-badge");
  if (qaBadge) qaBadge.innerText = curr;
  var fxPanel = document.getElementById("fx-panel");
  if (fxPanel) fxPanel.classList.toggle("hidden", curr !== "CNY");
  refreshQuickAddAmountInput();
  ledgerController.refresh();
  if (curr === "CNY" && state.fxMode === "auto" && !isValidCurrencyRate(state.fxRateAuto)) {
    refreshAutoRate().then(() => ledgerController.refresh());
  }
}

function changeFxMode(mode) {
  state.fxMode = mode;
  var autoBtn = document.getElementById("fx-mode-auto");
  var manualBtn = document.getElementById("fx-mode-manual");
  if (autoBtn) autoBtn.classList.toggle("active", mode === "auto");
  if (manualBtn) manualBtn.classList.toggle("active", mode === "manual");
  var input = document.getElementById("manual-rate-input");
  var btn = document.getElementById("btn-apply-rate");
  if (input) { input.disabled = mode !== "manual"; input.classList.toggle("hidden", mode !== "manual"); }
  if (mode === "manual") { if (btn) btn.classList.remove("hidden"); }
  else {
    if (btn) btn.classList.add("hidden");
    ledgerController.refresh();
    if (state.currentCurrency === "CNY" && !isValidCurrencyRate(state.fxRateAuto)) refreshAutoRate().then(() => ledgerController.refresh());
  }
}

function applyManualRate() {
  var input = document.getElementById("manual-rate-input");
  var val = parseFloat(input ? input.value : "");
  if (!val || val <= 0) { showToast(t("manual_rate_prompt"), true); return; }
  state.fxRateManual = val;
  showToast(t("manual_rate_applied"));
  ledgerController.refresh();
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  var isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("thao_dark_mode", isDark ? "1" : "0");
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  var btn = document.getElementById("btn-theme");
  if (!btn) return;
  var iconEl = btn.querySelector("[data-icon]");
  if (iconEl) {
    iconEl.dataset.icon = isDark ? "sun" : "moon";
    initIcons();
  }
}

function togglePrivacy() {
  document.body.classList.toggle("privacy-mode");
  var isPrivate = document.body.classList.contains("privacy-mode");
  var eyeBtn = document.getElementById("btn-privacy");
  if (eyeBtn) {
    var iconEl = eyeBtn.querySelector("[data-icon]");
    if (iconEl) {
      iconEl.dataset.icon = isPrivate ? "eyeOff" : "eye";
      initIcons();
    }
  }
}

function shareApp() {
  navigator.clipboard.writeText(window.location.href).then(
    function() { showToast(t("link_copied")); },
    function() { showToast(t("link_copy_failed")); }
  );
}

async function importDataHandler(event) {
  var file = event.target?.files?.[0];
  if (!file || !state.currentUser) return;
  try {
    var result = await importData(file);
    if (result) { showToast(t("import_success")); setTimeout(function() { window.location.reload(); }, 1000); }
  } catch (err) {
    const messages = {
      FILE_TOO_LARGE: t("import_file_too_large"),
      DANGEROUS_TEXT: t("import_dangerous_text"),
    };
    showToast(messages[err.code] || t("import_format_error"), true);
  }
}

function exportToCSV() {
  var csvContent = buildLegacyCsv({
    year: state.activeYear,
    balances: state.appState.balances,
    entries: state.appState.entries,
    categories: expenseCategories,
    daysInMonth: getDaysInMonth,
    evaluate: safeEval,
  });
  var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  var link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = state.activeYear + "_" + t("app_name") + ".csv";
  link.click();
}

// Initialize dark mode from localStorage
(function initDarkMode() {
  var saved = localStorage.getItem("thao_dark_mode");
  if (saved === "1") {
    document.documentElement.classList.add("dark");
    var iconEl = document.querySelector("#btn-theme [data-icon]");
    if (iconEl) iconEl.dataset.icon = "sun";
  }
})();

// Init icons on first load
setTimeout(initIcons, 50);
setTimeout(function() { initNavigation(appRouter); }, 50);
setTimeout(function () {
  bindCommands(document, {
    importFile: function () { document.getElementById("import-file")?.click(); },
    exportData: exportToCSV,
    share: shareApp,
    setLanguage: switchLanguage,
    toggleTheme: toggleDarkMode,
    togglePrivacy: togglePrivacy,
    logout: logoutApp,
  });
}, 50);
setTimeout(updateLedgerToggleLabel, 50);

initAuth(
  function(user) {
    appRouter.start("overview");
    depositController.start(user);
    initDashboard();
    savingsController.start();
    ledgerController.start();
    setTimeout(function() {
      updateBudgetUI();
      initIcons();
    }, 300);
  },
  function() { ledgerController.stop(); savingsController.stop(); appRouter.stop(); depositController.stop(); }
);
}
