import "../css/app.css";
import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday, getNextLedgerMidnightDelay } from "./clock.js";
import { safeEval, formatDisplay, formatSymbol, getActiveRate, setCurrencyGetter, setRateGetter, showToast } from "./utils.js";
import { formatVndForCurrencyInput, isValidCurrencyRate, parseCurrencyInputToVnd } from "./currency-view.js";
import { initAuth, handleLogin, logoutApp, updateActivityTime } from "./auth.js";
import { setupRealtimeListener, teardownListener, triggerCloudSave, importData } from "./sync.js";
import { initCharts } from "./charts.js";
import { fullRebuildDOM, softUpdateDOM, renderMonthTable, renderStreakPanel, updateStreakAfterRecord } from "./render.js";
import { calculateAll, updateBudgetUI, saveBudgetAndCalculate } from "./budget.js";
import { openQuickAdd, closeQuickAdd, submitQuickAdd } from "./quick-add.js";
import { initIcons } from "./icons.js";
import { buildLegacyCsv } from "./export.js";
import { t, setLocale, getCurrentLocale, applyI18n } from "./i18n.js";
import { initNavigation } from "./navigation.js";
import { initDashboard } from "./dashboard.js";

window.switchMonthTab = switchMonthTab;
window.switchCurrency = switchCurrency;
window.switchLanguage = switchLanguage;
window.changeFxMode = changeFxMode;
window.applyManualRate = applyManualRate;
window.togglePrivacy = togglePrivacy;
window.toggleDarkMode = toggleDarkMode;
window.switchMobileView = switchMobileView;
window.toggleNavMore = toggleNavMore;
window.changeYear = changeYear;
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
window.softUpdateDOM = softUpdateDOM;
window.fullRebuildDOM = fullRebuildDOM;
window.renderStreakPanel = renderStreakPanel;
window.updateStreakAfterRecord = updateStreakAfterRecord;

setCurrencyGetter(function() { return state.currentCurrency; });
setRateGetter(function() { return state.fxMode === "auto" ? state.fxRateAuto : state.fxRateManual; });

var yearSelector = document.getElementById("year-selector");
if (yearSelector) {
  var ledgerYear = getLedgerToday().year;
  for (var y = ledgerYear - 2; y <= ledgerYear + 3; y++) {
    yearSelector.innerHTML += '<option value="' + y + '" ' + (y === state.activeYear ? "selected" : "") + '>' + y + '</option>';
  }
}
var displayYearText = document.getElementById("display-year-text");
if (displayYearText) displayYearText.innerText = state.activeYear;
document.title = state.activeYear + " " + t("app_name");
updateYearLabels();
applyI18n();

function isMathOrCell(el) {
  if (el.classList.contains("remark-input")) return false;
  return el.classList.contains("math-input") || el.classList.contains("cell-input");
}

function persistInputValue(target, vndValueToSave) {
  var dataType = target.getAttribute("data-type");
  var dataKey = target.getAttribute("data-key");
  if (dataType === "balance" && target.id) {
    state.appState.balances[target.id] = vndValueToSave;
    if (!state.pendingUpdates.balances) state.pendingUpdates.balances = {};
    state.pendingUpdates.balances[target.id] = vndValueToSave;
  } else if (dataType === "entry" && dataKey) {
    state.appState.entries[dataKey] = vndValueToSave;
    if (!state.pendingUpdates.entries) state.pendingUpdates.entries = {};
    state.pendingUpdates.entries[dataKey] = vndValueToSave;
    if (!dataKey.endsWith("_remark")) updateStreakAfterRecord();
  }
}

function scheduleInputSave() {
  clearTimeout(window._calcTimeout);
  window._calcTimeout = setTimeout(function() { calculateAll(); initDashboard(); }, 150);
  triggerCloudSave();
}

document.body.addEventListener("input", function(e) {
  var target = e.target;
  if (target.tagName === "INPUT" && !target.id.startsWith("qa-") && target.id !== "monthly-budget-input") {
    if (state.currentUser) updateActivityTime();
    var val = target.value;
    var vndValueToSave = val;
    if (isMathOrCell(target)) {
      if (state.currentCurrency === "CNY") {
        target.dataset.currencyInputDirty = "1";
        return;
      }
      target.dataset.raw = vndValueToSave;
    }
    persistInputValue(target, vndValueToSave);
    scheduleInputSave();
  }
});

document.body.addEventListener("focusin", function(e) {
  if (isMathOrCell(e.target) && !e.target.readOnly) {
    e.target.dataset.currencyRawBefore = e.target.dataset.raw || "";
    if (state.currentCurrency === "VND") {
      if (e.target.dataset.raw !== undefined && e.target.dataset.raw !== "") e.target.value = e.target.dataset.raw;
    } else {
      e.target.value = formatVndForCurrencyInput(e.target.dataset.raw, state.currentCurrency, getActiveRate());
    }
    e.target.dataset.currencyViewBefore = e.target.value;
  }
});

document.body.addEventListener("focusout", function(e) {
  if (isMathOrCell(e.target) && !e.target.readOnly) {
    var rawInput = e.target.value;
    if (state.currentCurrency === "VND") {
      e.target.dataset.raw = rawInput;
      e.target.value = rawInput ? formatDisplay(safeEval(rawInput)) : "";
    } else {
      var activeRate = getActiveRate();
      if (!isValidCurrencyRate(activeRate)) {
        e.target.dataset.raw = e.target.dataset.currencyRawBefore || "";
        e.target.value = e.target.dataset.currencyViewBefore || "";
        showToast(t("fx_unavailable"), true);
        delete e.target.dataset.currencyRawBefore;
        delete e.target.dataset.currencyViewBefore;
        delete e.target.dataset.currencyInputDirty;
        return;
      }
      var vndVal = parseCurrencyInputToVnd(rawInput, {
        currency: state.currentCurrency,
        rate: activeRate,
        previousRawVnd: e.target.dataset.currencyRawBefore,
        previousViewValue: e.target.dataset.currencyViewBefore,
        evaluate: safeEval,
      });
      e.target.dataset.raw = vndVal;
      e.target.value = rawInput ? formatDisplay(vndVal) : "";
      if (e.target.dataset.currencyInputDirty === "1") {
        persistInputValue(e.target, vndVal);
        scheduleInputSave();
      }
    }
    delete e.target.dataset.currencyRawBefore;
    delete e.target.dataset.currencyViewBefore;
    delete e.target.dataset.currencyInputDirty;
  }
});

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

window.addEventListener("beforeunload", function(e) {
  if (state.isSaving && navigator.onLine) { e.preventDefault(); e.returnValue = t("unsaved_warning"); }
});

document.getElementById("quick-add-modal")?.addEventListener("click", function(e) {
  if (e.target === e.currentTarget) closeQuickAdd();
});

function switchMonthTab(monthId) {
  state.activeMonthId = monthId;
  document.querySelectorAll('[id^="btn-tab-"]').forEach(function(btn) { btn.className = "month-tab"; });
  var activeBtn = document.getElementById("btn-tab-" + monthId);
  if (activeBtn) activeBtn.className = "month-tab active";
  fullRebuildDOM();
  initDashboard();
  var chartTitle = document.getElementById("monthly-chart-title");
  if (chartTitle) chartTitle.innerText = t("monthly", { month: monthId });
  var b = document.getElementById("budget-label-month");
  if (b) b.innerText = monthId;
}

function updateYearLabels() {
  var startLabel = document.getElementById("ui-year-start-label");
  var endLabel = document.getElementById("ui-year-end-label");
  if (startLabel) startLabel.textContent = t("year_start_assets", { year: state.activeYear });
  if (endLabel) endLabel.textContent = t("year_end_assets", { year: state.activeYear });
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
    updateYearLabels();
    var chartTitle = document.getElementById("monthly-chart-title");
    if (chartTitle && state.activeMonthId) chartTitle.textContent = t("monthly", { month: state.activeMonthId });
    document.title = state.activeYear + " " + t("app_name");
    var budgetMonth = document.getElementById("budget-label-month");
    if (budgetMonth) budgetMonth.textContent = t("month_display", { month: state.activeMonthId });
    fullRebuildDOM();
    renderStreakPanel();
  }
}

var lastLedgerDate = getLedgerToday();
var ledgerDateTimer = null;

function syncYearLabels() {
  var displayYearText = document.getElementById("display-year-text");
  if (displayYearText) displayYearText.innerText = state.activeYear;
  document.title = state.activeYear + " " + t("app_name");
  updateYearLabels();
  var selector = document.getElementById("year-selector");
  if (selector) selector.value = String(state.activeYear);
}

function refreshForLedgerDateChange() {
  var today = getLedgerToday();
  if (today.dateKey === lastLedgerDate.dateKey) return;
  var wasViewingCurrentLedgerMonth = state.activeYear === lastLedgerDate.year && state.activeMonthId === lastLedgerDate.month;
  lastLedgerDate = today;
  if (wasViewingCurrentLedgerMonth) {
    if (state.activeYear !== today.year) {
      changeYear(today.year);
    } else {
      switchMonthTab(today.month);
    }
  } else {
    fullRebuildDOM();
  }
  renderStreakPanel();
}

function scheduleLedgerDateRefresh() {
  if (ledgerDateTimer) clearTimeout(ledgerDateTimer);
  ledgerDateTimer = setTimeout(function() {
    refreshForLedgerDateChange();
    scheduleLedgerDateRefresh();
  }, getNextLedgerMidnightDelay());
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
  if (fxPanel) {
    if (curr === "CNY") { fxPanel.classList.remove("hidden"); fxPanel.classList.add("flex"); }
    else { fxPanel.classList.add("hidden"); fxPanel.classList.remove("flex"); }
  }
  fullRebuildDOM();
}

function changeFxMode(mode) {
  state.fxMode = mode;
  var input = document.getElementById("manual-rate-input");
  var btn = document.getElementById("btn-apply-rate");
  if (mode === "manual") { if (input) input.disabled = false; if (btn) btn.classList.remove("hidden"); }
  else { if (input) input.disabled = true; if (btn) btn.classList.add("hidden"); fullRebuildDOM(); }
}

function applyManualRate() {
  var input = document.getElementById("manual-rate-input");
  var val = parseFloat(input ? input.value : "");
  if (!val || val <= 0) { showToast(t("manual_rate_prompt"), true); return; }
  state.fxRateManual = val;
  showToast(t("manual_rate_applied"));
  fullRebuildDOM();
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

function switchMobileView(view) {
  document.querySelectorAll(".bottom-nav-item").forEach(function(el) { el.classList.remove("active"); });
  var activeBtn = document.querySelector('[data-nav="' + view + '"]');
  if (activeBtn) activeBtn.classList.add("active");

  if (view === "add") { openQuickAdd(); return; }

  var mainCol = document.querySelector(".flex-1.min-w-0");
  var sidebar = document.querySelector(".w-full.xl\\:w-96");
  if (!mainCol || !sidebar) return;

  if (view === "overview") {
    mainCol.style.display = "";
    sidebar.style.display = "none";
  } else if (view === "stats") {
    mainCol.style.display = "none";
    sidebar.style.display = "";
  }
}

function toggleNavMore(e) {
  if (e) e.stopPropagation();
  var panel = document.getElementById("nav-secondary");
  if (!panel) return;
  panel.classList.toggle("open");
}

// Click outside to close nav dropdown
document.addEventListener("click", function(e) {
  var panel = document.getElementById("nav-secondary");
  var btn = document.getElementById("nav-more-btn");
  if (!panel || !btn) return;
  if (!panel.classList.contains("open")) return;
  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove("open");
  }
});

// Override fullRebuildDOM to also init icons and dashboard after DOM rebuild
var _originalFullRebuildDOM = fullRebuildDOM;
window.fullRebuildDOM = function() {
  _originalFullRebuildDOM();
  setTimeout(initIcons, 50);
  initDashboard();
};

var _originalSoftUpdateDOM = softUpdateDOM;
window.softUpdateDOM = function() {
  _originalSoftUpdateDOM();
  setTimeout(initIcons, 50);
  initDashboard();
};

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

function changeYear(newYear) {
  newYear = parseInt(newYear);
  if (newYear === state.activeYear) return;
  if (state.isSaving && navigator.onLine) { showToast(t("syncing_year_switch"), true); document.getElementById("year-selector").value = state.activeYear; return; }
  state.activeYear = newYear;
  syncYearLabels();
  var monthsContainer = document.getElementById("months-container");
  if (monthsContainer) monthsContainer.innerHTML = "";
  state.appState = { balances: {}, entries: {}, settings: {} };
  state.previousYearEntries = {};
  state.yearlyCatSums = {};
  state.monthlyCatSums = {};
  state.pendingUpdates = { balances: {}, entries: {}, settings: {} };
  ["bal-bank","bal-alipay","bal-wechat","bal-other","end-bal-bank","end-bal-alipay","end-bal-wechat","end-bal-other"].forEach(function(id) {
    var el = document.getElementById(id); if (el) { el.value = ""; el.dataset.raw = ""; }
  });
  setupRealtimeListener();
  state.isFirstLoad = true;
  var today = getLedgerToday();
  var targetMonth = state.activeYear === today.year ? today.month : 1;
  switchMonthTab(targetMonth);
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
setTimeout(initNavigation, 50);

initAuth(
  function(user) {
    setupRealtimeListener();
    initCharts();
    renderStreakPanel();
    initDashboard();
    setTimeout(function() {
      updateBudgetUI();
      var today = getLedgerToday();
      var targetMonth = state.activeYear === today.year ? today.month : 1;
      switchMonthTab(targetMonth);
      initIcons();
    }, 300);
  },
  function() { teardownListener(); }
);

document.addEventListener("visibilitychange", function() {
  if (!document.hidden) {
    refreshForLedgerDateChange();
    scheduleLedgerDateRefresh();
  }
});
window.addEventListener("focus", function() {
  refreshForLedgerDateChange();
  scheduleLedgerDateRefresh();
});
scheduleLedgerDateRefresh();
