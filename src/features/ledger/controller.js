export function createLedgerController({
  state,
  documentRoot,
  windowRoot,
  inputController,
  yearController,
  sync,
  clock,
  renderLedger,
  softRenderLedger,
  renderStreak,
  updateStreakFromSnapshot,
  refreshDashboardForMonth,
  refreshDashboard,
  refreshSavings,
  scheduleIcons,
  notifyDomRebuilt,
  translate,
  setTimer = (callback, delay) => windowRoot.setTimeout(callback, delay),
  clearTimer = timer => windowRoot.clearTimeout(timer),
}) {
  let mounted = false;
  let midnightTimer = null;
  let lastLedgerDate = clock.getToday();

  function updateMonthChrome() {
    documentRoot.querySelectorAll("[data-ledger-month]").forEach(button => {
      const month = Number(button.dataset.ledgerMonth);
      button.className = month === state.activeMonthId ? "month-tab active" : "month-tab";
      button.textContent = translate("month_tab", { month });
    });
    const chartTitle = documentRoot.getElementById("monthly-chart-title");
    if (chartTitle) chartTitle.textContent = translate("monthly", { month: state.activeMonthId });
    const budgetMonth = documentRoot.getElementById("budget-label-month");
    if (budgetMonth) budgetMonth.textContent = String(state.activeMonthId);
  }

  function switchMonth(value) {
    const month = Number(value);
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    state.activeMonthId = month;
    updateMonthChrome();
    renderLedger();
    refreshDashboardForMonth();
    refreshSavings();
    scheduleIcons();
    return true;
  }

  function refresh() {
    renderLedger();
    refreshDashboard();
    refreshSavings();
    scheduleIcons();
    notifyDomRebuilt();
  }

  function softRefresh() {
    softRenderLedger();
    refreshDashboard();
    refreshSavings();
    scheduleIcons();
  }

  function restartSync() {
    sync.stop();
    sync.start({
      onSnapshotApplied: softRefresh,
      onStreakRefresh: () => updateStreakFromSnapshot({ launchDefaultFireworks: false }),
    });
  }

  function refreshForDateChange() {
    const today = clock.getToday();
    if (today.dateKey === lastLedgerDate.dateKey) return false;
    const wasViewingCurrentLedgerMonth =
      state.activeYear === lastLedgerDate.year &&
      state.activeMonthId === lastLedgerDate.month;
    if (wasViewingCurrentLedgerMonth) {
      if (state.activeYear !== today.year) {
        if (!yearController.changeYear(today.year)) return false;
      } else {
        switchMonth(today.month);
      }
    } else {
      refresh();
    }
    lastLedgerDate = today;
    renderStreak();
    return true;
  }

  function scheduleMidnightRefresh() {
    if (midnightTimer !== null) clearTimer(midnightTimer);
    midnightTimer = setTimer(() => {
      midnightTimer = null;
      refreshForDateChange();
      if (mounted) scheduleMidnightRefresh();
    }, clock.getNextMidnightDelay());
  }

  function onMonthClick(event) {
    const button = event.target.closest?.("[data-ledger-month]");
    if (button) switchMonth(button.dataset.ledgerMonth);
  }

  function onLocaleChanged() {
    yearController.refreshLabels();
    updateMonthChrome();
    refresh();
    renderStreak();
  }

  function onVisibilityChange() {
    if (!documentRoot.hidden) {
      refreshForDateChange();
      scheduleMidnightRefresh();
    }
  }

  function onFocus() {
    refreshForDateChange();
    scheduleMidnightRefresh();
  }

  function mount() {
    if (mounted) return;
    inputController.start();
    yearController.start();
    lastLedgerDate = clock.getToday();
    documentRoot.addEventListener("click", onMonthClick);
    documentRoot.addEventListener("visibilitychange", onVisibilityChange);
    windowRoot.addEventListener("focus", onFocus);
    windowRoot.addEventListener("app-locale-rendered", onLocaleChanged);
    mounted = true;
    scheduleMidnightRefresh();
  }

  function start() {
    mount();
    restartSync();
    const today = clock.getToday();
    switchMonth(state.activeYear === today.year ? today.month : 1);
    renderStreak();
  }

  function stop() {
    inputController.stop();
    yearController.stop();
    sync.stop();
    documentRoot.removeEventListener("click", onMonthClick);
    documentRoot.removeEventListener("visibilitychange", onVisibilityChange);
    windowRoot.removeEventListener("focus", onFocus);
    windowRoot.removeEventListener("app-locale-rendered", onLocaleChanged);
    if (midnightTimer !== null) clearTimer(midnightTimer);
    midnightTimer = null;
    mounted = false;
  }

  return {
    mount,
    refresh,
    refreshForDateChange,
    restartSync,
    start,
    stop,
    switchMonth,
  };
}
