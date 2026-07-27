const BALANCE_INPUT_IDS = [
  "bal-bank",
  "bal-alipay",
  "bal-wechat",
  "bal-other",
  "end-bal-bank",
  "end-bal-alipay",
  "end-bal-wechat",
  "end-bal-other",
];

/** @param {import("../../types/app-state").LedgerYearControllerDependencies} dependencies */
export function createLedgerYearController({
  state,
  documentRoot,
  getToday,
  isOnline,
  translate,
  showBlocked,
  resetYearState,
  resubscribe,
  switchMonth,
}) {
  let started = false;

  /** @returns {HTMLSelectElement | null} */
  function selector() {
    return /** @type {HTMLSelectElement | null} */ (documentRoot.getElementById("year-selector"));
  }

  function refreshLabels() {
    const displayYear = documentRoot.getElementById("display-year-text");
    if (displayYear) displayYear.innerText = String(state.activeYear);
    documentRoot.title = `${state.activeYear} ${translate("app_name")}`;
    const startLabel = documentRoot.getElementById("ui-year-start-label");
    const endLabel = documentRoot.getElementById("ui-year-end-label");
    if (startLabel) startLabel.textContent = translate("year_start_assets", { year: state.activeYear });
    if (endLabel) endLabel.textContent = translate("year_end_assets", { year: state.activeYear });
    const yearSelector = selector();
    if (yearSelector) yearSelector.value = String(state.activeYear);
  }

  function populateOptions() {
    const yearSelector = selector();
    if (!yearSelector) return;
    const ledgerYear = getToday().year;
    yearSelector.innerHTML = "";
    for (let year = ledgerYear - 2; year <= ledgerYear + 3; year += 1) {
      const option = documentRoot.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      yearSelector.append(option);
    }
    yearSelector.value = String(state.activeYear);
  }

  function clearRenderedYear() {
    const monthsContainer = documentRoot.getElementById("months-container");
    if (monthsContainer) monthsContainer.innerHTML = "";
    for (const id of BALANCE_INPUT_IDS) {
      const input = /** @type {HTMLInputElement | null} */ (documentRoot.getElementById(id));
      if (input) {
        input.value = "";
        input.dataset.raw = "";
      }
    }
  }

  /** @param {string | number} value */
  function changeYear(value) {
    const nextYear = Number.parseInt(String(value), 10);
    if (!Number.isInteger(nextYear) || nextYear === state.activeYear) return false;
    if (state.isSaving && isOnline()) {
      showBlocked(translate("syncing_year_switch"));
      const yearSelector = selector();
      if (yearSelector) yearSelector.value = String(state.activeYear);
      return false;
    }
    state.activeYear = nextYear;
    refreshLabels();
    clearRenderedYear();
    resetYearState();
    state.isFirstLoad = true;
    resubscribe();
    const today = getToday();
    switchMonth(nextYear === today.year ? today.month : 1);
    return true;
  }

  /** @param {Event} event */
  function onYearChange(event) {
    if (event.target instanceof HTMLSelectElement) changeYear(event.target.value);
  }

  function start() {
    if (started) stop();
    populateOptions();
    refreshLabels();
    selector()?.addEventListener("change", onYearChange);
    started = true;
  }

  function stop() {
    if (!started) return;
    selector()?.removeEventListener("change", onYearChange);
    started = false;
  }

  return { changeYear, refreshLabels, start, stop };
}
