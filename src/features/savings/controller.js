import { bindSavingsGoalForm, buildSavingsViewModel, installSavingsSyncBridge, renderSavingsPage, renderSavingsSummary, setSavingsStatus } from "./view.js";

/** @param {import("../../types/app-state").SavingsControllerDependencies} [dependencies] */
export function createSavingsController({
  root = document.getElementById("savings-root"),
  getSavingsState,
  getLocale = () => "vi",
  getDashboardViewModel,
  formatMoney,
  triggerCloudSave = () => {},
} = {}) {
  let stopBridge = () => {};
  let stopForm = () => {};

  function stopBindings() {
    stopBridge();
    stopForm();
    stopBridge = () => {};
    stopForm = () => {};
  }

  /** @param {string} [status] */
  function update(status = "synced") {
    stopBindings();
    if (!root) return;

    const snapshot = getSavingsState?.();
    if (!snapshot) return;

    const dashboard = /** @type {(month: number) => import("../../types/app-state").DashboardViewModel} */ (getDashboardViewModel);
    const monthlyVm = dashboard(snapshot.month);

    let annualIncome = 0;
    let annualExpense = 0;
    for (let month = 1; month <= 12; month += 1) {
      const vm = dashboard(month);
      annualIncome += vm.totalIncome;
      annualExpense += vm.totalSpending;
    }

    const locale = getLocale();
    const vm = buildSavingsViewModel({
      settings: snapshot.settings,
      month: snapshot.month,
      monthlyIncome: monthlyVm.totalIncome,
      monthlyExpense: monthlyVm.totalSpending,
      annualIncome,
      annualExpense,
      locale,
      status,
    });

    root.dataset.locale = locale;
    root.innerHTML = renderSavingsSummary(vm, formatMoney) + renderSavingsPage(vm, formatMoney);

    stopForm = bindSavingsGoalForm(root, {
      settings: snapshot.settings,
      pendingUpdates: snapshot.pendingUpdates,
      month: snapshot.month,
      locale,
      onStatus: (next) => setSavingsStatus(root, next),
      onSave: () => {
        setSavingsStatus(root, "queued");
        triggerCloudSave();
      },
    });

    stopBridge = installSavingsSyncBridge(root);
  }

  return {
    start() { update(); },
    update,
    stop() { stopBindings(); },
  };
}
