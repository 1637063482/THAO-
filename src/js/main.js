import "../css/app.css";
import { state } from "./state.js";
import { expenseCategories, getDaysInMonth } from "./config.js";
import { getLedgerToday, getNextLedgerMidnightDelay } from "./clock.js";
import { safeEval, formatDisplay, formatSymbol, getActiveRate, setCurrencyGetter, setRateGetter, showToast } from "./utils.js";
import { formatVndForCurrencyInput, isValidCurrencyRate, parseCurrencyInputToVnd } from "./currency-view.js";
import { initAuth, handleLogin, logoutApp, updateActivityTime } from "./auth.js";
import { setupRealtimeListener, teardownListener, triggerCloudSave, importData } from "./sync.js";
import { initCharts, updateCharts } from "./charts.js";
import { fullRebuildDOM, softUpdateDOM, renderMonthTable, renderDailyLedger, renderStreakPanel, updateStreakAfterRecord } from "./render.js";
import { setLedgerView, getLedgerView } from "./day-ledger.js";
import { calculateAll, updateBudgetUI, saveBudgetAndCalculate } from "./budget.js";
import { openQuickAdd, closeQuickAdd, submitQuickAdd, queueLegacyIncomeOnce } from "./quick-add.js";
import { initIcons } from "./icons.js";
import { buildLegacyCsv } from "./export.js";
import { t, setLocale, getCurrentLocale, applyI18n } from "./i18n.js";
import { initNavigation } from "./navigation.js";
import { initDashboard, refreshDashboardAfterLocalUpdate, refreshDashboardAfterMonthSwitch } from "./dashboard.js";
import { buildSavingsViewModel, renderSavingsSummary, renderSavingsPage, bindSavingsGoalForm, setSavingsStatus, installSavingsSyncBridge } from "./savings-view.js";
import { buildDashboardViewModel } from "./dashboard-view-model.js";
import { db, projectId } from "./firebase.js";
import { DepositRepository } from "../infrastructure/firebase/deposit-repository.ts";
import { createEmptyDepositDocument } from "./deposit-schema.js";
import { subscribeToDeposits } from "./deposit-sync.js";
import { bindDepositManagement, buildDepositViewModel, renderDepositManagement } from "./deposit-view.js";
import { depositErrorMessage } from "./deposit-errors.js";
import { bindDepositForm, renderDepositForm, bindDepositSettlementForm, renderDepositSettlementForm } from "./deposit-form.js";
import { createDepositReminderController } from "./deposit-reminder-controller.js";
import { buildRolloverDepositId, redeemDeposit, rolloverDeposit } from "../application/deposits/settle-deposit.ts";

window.switchMonthTab = switchMonthTab;
window.switchCurrency = switchCurrency;
window.switchLanguage = switchLanguage;
window.changeFxMode = changeFxMode;
window.applyManualRate = applyManualRate;
window.togglePrivacy = togglePrivacy;
window.toggleDarkMode = toggleDarkMode;
window.switchMobileView = switchMobileView;
window.toggleLedgerView = toggleLedgerView;
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
applyI18n();
// updateYearLabels must run AFTER applyI18n so the {year} param is not
// overwritten by the unsubstituted template from applyI18n.
updateYearLabels();

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
    // Streak is checked on blur (focusout), not here on every keystroke
  }
}

export function scheduleInputSave() {
  clearTimeout(window._calcTimeout);
  window._calcTimeout = setTimeout(function() { calculateAll(); refreshDashboardAfterLocalUpdate(); }, 150);
  triggerCloudSave();
}

function refreshSavingsView(status) {
  const monthlyVm = buildDashboardViewModel({ year: state.activeYear, month: state.activeMonthId, state: { appState: state.appState } });
  let annualIncome = 0; let annualExpense = 0;
  for (let month = 1; month <= 12; month += 1) {
    const vm = buildDashboardViewModel({ year: state.activeYear, month, state: { appState: state.appState } });
    annualIncome += vm.totalIncome; annualExpense += vm.totalSpending;
  }
  const vm = buildSavingsViewModel({ settings: state.appState.settings, month: state.activeMonthId, monthlyIncome: monthlyVm.totalIncome, monthlyExpense: monthlyVm.totalSpending, annualIncome, annualExpense, locale: getCurrentLocale(), status: status || "synced" });
  const summary = document.getElementById("savings-root");
  if (!summary) return;
  summary.dataset.locale = getCurrentLocale();
  summary.innerHTML = renderSavingsSummary(vm) + renderSavingsPage(vm);
  bindSavingsGoalForm(summary, { settings: state.appState.settings, pendingUpdates: state.pendingUpdates.settings, month: state.activeMonthId, locale: getCurrentLocale(), onStatus: function(next) { setSavingsStatus(summary, next); }, onSave: function() { setSavingsStatus(summary, "queued"); triggerCloudSave(); } });
  installSavingsSyncBridge(summary);
}

let depositRepository = null;
let unsubscribeDeposits = null;
let depositUiStatus = "loading";
let depositUiError = "";
let depositFilter = "all";
let depositDataReady = false;
let depositSnapshotFromCache = false;
const depositReminderController = createDepositReminderController({
  root: document.getElementById("deposit-reminder-root"),
  getDocument: () => state.depositDocument,
  getToday: () => getLedgerToday().dateKey,
  getLocale: getCurrentLocale,
  isAuthenticated: () => Boolean(state.currentUser),
  isReady: () => depositDataReady,
  isOffline: () => !navigator.onLine || depositSnapshotFromCache,
  acknowledge: key => {
    if (!depositRepository) throw new Error("Deposit repository is unavailable");
    return depositRepository.acknowledge(key);
  },
});

function newDepositId() {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `deposit-${suffix}`;
}

function closeDepositForm() {
  const host = document.getElementById("deposit-form-root");
  if (host) host.innerHTML = "";
}

function openDepositForm(id = null) {
  const host = document.getElementById("deposit-form-root");
  if (!host) return;
  const deposit = id ? state.depositDocument.depositsById[id] : null;
  const formId = id || newDepositId();
  host.dataset.locale = getCurrentLocale();
  host.innerHTML = renderDepositForm({ locale: getCurrentLocale(), id: formId, deposit });
  bindDepositForm(host, {
    onClose: closeDepositForm,
    locale: getCurrentLocale(),
    async onSubmit(input, { expectedVersion }) {
      if (!depositRepository) throw new Error("Deposit repository is unavailable");
      depositUiStatus = "syncing";
      const { id: inputId, ...changes } = input;
      try {
        if (deposit) await depositRepository.update(inputId, expectedVersion, changes);
        else await depositRepository.create(input);
      } catch (error) {
        depositUiStatus = "error";
        throw error;
      }
      // UI refresh after successful save — outside the catch so a failed refresh
      // doesn't incorrectly show "save failed" when the data was already persisted.
      closeDepositForm();
      refreshDepositView();
    },
  });
}

function settlementRecord(id) {
  const record = state.depositDocument.depositsById[id];
  if (!record) throw new Error("Deposit is unavailable");
  return { id, ...record };
}

function rolloverInput(id, record) {
  return {
    id, institutionName: record.institutionName, productName: record.productName,
    principalVnd: record.principalVnd, annualRatePpm: record.annualRatePpm,
    openedOn: record.openedOn, maturesOn: record.maturesOn,
    expectedInterestVnd: record.expectedInterestVnd, actualInterestVnd: record.actualInterestVnd,
    reminderDays: [...record.reminderDays], remindersEnabled: record.remindersEnabled,
    status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: record.note,
  };
}

function settlementDependencies() {
  if (!depositRepository) throw new Error("Deposit repository is unavailable");
  return {
    updateDeposit: (id, version, changes) => depositRepository.update(id, version, changes),
    queueLegacyInterest: input => queueLegacyIncomeOnce(input),
  };
}

function rolloverDependencies() {
  const base = settlementDependencies();
  return { ...base, getDeposit: id => depositRepository.get(id), createDeposit: input => depositRepository.create(input) };
}

function openDepositSettlement(id, mode) {
  const host = document.getElementById("deposit-form-root"); if (!host) return;
  const deposit = settlementRecord(id); const locale = getCurrentLocale();
  host.dataset.locale = locale;
  host.innerHTML = renderDepositSettlementForm({ locale, deposit, mode, today: getLedgerToday().dateKey });
  bindDepositSettlementForm(host, {
    locale, onClose: closeDepositForm,
    async onSubmit(input) {
      depositUiStatus = "syncing"; refreshDepositView();
      try {
        if (input.mode === "redeem") {
          await redeemDeposit({ deposit, settledOn: input.settledOn, actualInterestVnd: input.actualInterestVnd, writeInterestToLedger: input.writeInterestToLedger }, settlementDependencies());
        } else {
          const next = { id: buildRolloverDepositId(deposit), ...input.rollover };
          await rolloverDeposit({ deposit, rolloverDeposit: next, actualInterestVnd: input.actualInterestVnd, writeInterestToLedger: input.writeInterestToLedger }, rolloverDependencies());
        }
        closeDepositForm(); refreshDepositView();
      } catch (error) { depositUiStatus = "error"; depositUiError = depositErrorMessage(error, getCurrentLocale(), "list"); refreshDepositView(); throw error; }
    },
  });
}

async function retryDepositInterest(id) {
  const deposit = settlementRecord(id); const locale = getCurrentLocale();
  const message = locale === "zh-CN" ? "确认只将实收利息记入收入？本金不会记作收入。" : "Chỉ ghi tiền lãi thực nhận vào thu nhập? Tiền gốc sẽ không được ghi.";
  if (globalThis.confirm && !globalThis.confirm(message)) return;
  depositUiStatus = "syncing"; refreshDepositView();
  try {
    if (deposit.status === "REDEEMED") {
      await redeemDeposit({ deposit, settledOn: deposit.redeemedOn, actualInterestVnd: deposit.actualInterestVnd, writeInterestToLedger: true }, settlementDependencies());
    } else if (deposit.status === "ROLLED_OVER") {
      const target = settlementRecord(deposit.rolledOverToDepositId);
      await rolloverDeposit({ deposit, rolloverDeposit: rolloverInput(target.id, target), actualInterestVnd: deposit.actualInterestVnd, writeInterestToLedger: true }, rolloverDependencies());
    }
    depositUiStatus = "synced"; refreshDepositView();
  } catch (error) { depositUiStatus = "error"; depositUiError = depositErrorMessage(error, getCurrentLocale(), "list"); refreshDepositView(); throw error; }
}

function refreshDepositView() {
  const root = document.getElementById("deposit-root");
  if (!root) return;
  const vm = buildDepositViewModel({
    document: state.depositDocument,
    today: getLedgerToday().dateKey,
    locale: getCurrentLocale(),
    status: depositUiStatus,
    errorMessage: depositUiError,
    filter: depositFilter,
    ledgerEntries: state.appState.entries,
  });
  root.innerHTML = renderDepositManagement(vm);
  bindDepositManagement(root, {
    onAdd: () => openDepositForm(),
    onEdit: id => openDepositForm(id),
    onRedeem: id => openDepositSettlement(id, "redeem"),
    onRollover: id => openDepositSettlement(id, "rollover"),
    onRecordInterest: id => retryDepositInterest(id),
    async onArchive(id) {
      const record = state.depositDocument.depositsById[id];
      if (!depositRepository || !record) throw new Error("Deposit is unavailable");
      depositUiStatus = "syncing";
      refreshDepositView();
      try {
        await depositRepository.archive(id, record.version);
      } catch (error) {
        depositUiStatus = "error";
        depositUiError = depositErrorMessage(error, getCurrentLocale(), "list");
        refreshDepositView();
        throw error;
      }
    },
    async onDelete(id) {
      const record = state.depositDocument.depositsById[id];
      if (!depositRepository || !record) throw new Error("Deposit is unavailable");
      depositUiStatus = "syncing";
      refreshDepositView();
      try {
        await depositRepository.delete(id, record.version);
      } catch (error) {
        depositUiStatus = "error";
        depositUiError = depositErrorMessage(error, getCurrentLocale(), "list");
        refreshDepositView();
        throw error;
      }
    },
    onFilter: next => { depositFilter = next; refreshDepositView(); },
  });
}

function stopDepositManagement() {
  if (unsubscribeDeposits) unsubscribeDeposits();
  unsubscribeDeposits = null;
  depositRepository = null;
  depositUiStatus = "loading";
  depositUiError = "";
  depositFilter = "all";
  depositDataReady = false;
  depositSnapshotFromCache = false;
  depositReminderController.destroy();
  state.depositDocument = createEmptyDepositDocument();
  refreshDepositView();
}

function startDepositManagement(user) {
  if (unsubscribeDeposits) unsubscribeDeposits();
  depositRepository = new DepositRepository(db, projectId, user.uid);
  depositDataReady = false;
  depositSnapshotFromCache = false;
  depositReminderController.destroy();
  depositUiStatus = navigator.onLine ? "loading" : "offline";
  depositUiError = "";
  refreshDepositView();
  unsubscribeDeposits = subscribeToDeposits(db, projectId, {
    onChange(_document, metadata = {}) {
      depositDataReady = true;
      depositSnapshotFromCache = Boolean(metadata.fromCache);
      depositUiStatus = navigator.onLine && !depositSnapshotFromCache ? "synced" : "offline";
      refreshDepositView();
      depositReminderController.check();
    },
    onError() { depositSnapshotFromCache = true; depositUiStatus = navigator.onLine ? "error" : "offline"; refreshDepositView(); },
  });
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
  // Trigger streak check on blur — input is complete, not on every keystroke
  var _dataKey = e.target.getAttribute("data-key");
  if (_dataKey && !_dataKey.endsWith("_remark")) updateStreakAfterRecord();
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

export function switchMonthTab(monthId) {
  state.activeMonthId = monthId;
  document.querySelectorAll('[id^="btn-tab-"]').forEach(function(btn) { btn.className = "month-tab"; });
  var activeBtn = document.getElementById("btn-tab-" + monthId);
  if (activeBtn) activeBtn.className = "month-tab active";
  fullRebuildDOM();
  refreshDashboardAfterMonthSwitch();
  var chartTitle = document.getElementById("monthly-chart-title");
  if (chartTitle) chartTitle.innerText = t("monthly", { month: monthId });
  var b = document.getElementById("budget-label-month");
  if (b) b.innerText = monthId;
}

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

export function toggleLedgerView() {
  setLedgerView(getLedgerView() === "daily" ? "table" : "daily");
  renderDailyLedger(state.activeMonthId);
  updateLedgerToggleLabel();
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
    // Update month tab labels for the new locale
    for (var _m = 1; _m <= 12; _m++) {
      var _tab = document.getElementById("btn-tab-" + _m);
      if (_tab) _tab.textContent = t("month_tab", { month: _m });
    }
    updateLedgerToggleLabel();
    window.fullRebuildDOM();
    renderStreakPanel();
    updateCharts();
    depositReminderController.check();
  }
}

var _chartsInited = false;
function ensureCharts() {
  if (_chartsInited) { updateCharts(); return; }
  initCharts();
  _chartsInited = true;
  updateCharts();
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
  depositReminderController.check();
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

  var overviewContent = document.getElementById("overview-content");
  var analysisView = document.getElementById("analysis-view");
  var savingsView = document.getElementById("savings-view");
  if (!overviewContent || !analysisView || !savingsView) return;

  if (view === "overview") {
    overviewContent.style.display = "";
    analysisView.style.display = "none";
    savingsView.style.display = "none";
    depositReminderController.check();
  } else if (view === "stats") {
    overviewContent.style.display = "none";
    analysisView.style.display = "";
    savingsView.style.display = "none";
    ensureCharts();
  } else if (view === "savings") {
    overviewContent.style.display = "none";
    analysisView.style.display = "none";
    savingsView.style.display = "";
    depositReminderController.check();
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
  refreshSavingsView();
  refreshDepositView();
};

var _originalSoftUpdateDOM = softUpdateDOM;
window.softUpdateDOM = function() {
  _originalSoftUpdateDOM();
  setTimeout(initIcons, 50);
  initDashboard();
  refreshSavingsView();
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
setTimeout(updateLedgerToggleLabel, 50);

initAuth(
  function(user) {
    setupRealtimeListener();
    startDepositManagement(user);
    renderStreakPanel();
    initDashboard();
    refreshSavingsView();
    setTimeout(function() {
      updateBudgetUI();
      var today = getLedgerToday();
      var targetMonth = state.activeYear === today.year ? today.month : 1;
      switchMonthTab(targetMonth);
      initIcons();
    }, 300);
  },
  function() { teardownListener(); stopDepositManagement(); }
);

window.addEventListener("offline", function() {
  if (!state.currentUser) return;
  depositUiStatus = "offline";
  refreshDepositView();
  depositReminderController.check();
});
window.addEventListener("online", function() {
  if (!state.currentUser) return;
  startDepositManagement(state.currentUser);
});

document.addEventListener("visibilitychange", function() {
  if (!document.hidden) {
    refreshForLedgerDateChange();
    scheduleLedgerDateRefresh();
    depositReminderController.check();
  }
});
window.addEventListener("focus", function() {
  refreshForLedgerDateChange();
  scheduleLedgerDateRefresh();
  depositReminderController.check();
});
scheduleLedgerDateRefresh();
