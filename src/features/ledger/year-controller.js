import { bindAppDropdown, setAppDropdownOptions, setAppDropdownValue } from "../../components/feedback/app-dropdown.js";

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
  hasPendingChanges = () => false,
}) {
  let started = false;
  let unbindDropdown = () => {};

  /** @returns {HTMLElement | null} */
  function selector() {
    return documentRoot.getElementById("year-selector");
  }

  function refreshLabels() {
    documentRoot.title = `${state.activeYear} ${translate("app_name")}`;
    const startLabel = documentRoot.getElementById("ui-year-start-label");
    const endLabel = documentRoot.getElementById("ui-year-end-label");
    if (startLabel) startLabel.textContent = translate("year_start_assets", { year: state.activeYear });
    if (endLabel) endLabel.textContent = translate("year_end_assets", { year: state.activeYear });
    setAppDropdownValue(selector(), String(state.activeYear));
  }

  function populateOptions() {
    const ledgerYear = getToday().year;
    setAppDropdownOptions(selector(), Array.from({ length: 6 }, (_, offset) => {
      const year = ledgerYear - 2 + offset;
      return { value: String(year), label: String(year), selected: year === state.activeYear };
    }));
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
    if (state.isSaving || hasPendingChanges()) {
      showBlocked(translate("syncing_year_switch"));
      setAppDropdownValue(selector(), String(state.activeYear));
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

  function start() {
    if (started) stop();
    populateOptions();
    refreshLabels();
    unbindDropdown = bindAppDropdown(selector(), { onChange: value => changeYear(value) });
    started = true;
  }

  function stop() {
    if (!started) return;
    unbindDropdown();
    started = false;
  }

  return { changeYear, refreshLabels, start, stop };
}
