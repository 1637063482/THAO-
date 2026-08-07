import { state } from "../../js/state.js";
import { t } from "../../js/i18n.js";
import { formatSymbol } from "../../js/utils.js";
import { buildAnalyticsViewModel } from "./model.js";
import { renderAnalyticsView, updateAnalyticsView } from "./view.js";

function getRoot(root) {
  return root || document.getElementById("analysis-root");
}

function getModel() {
  return buildAnalyticsViewModel({
    year: state.activeYear,
    activeMonth: state.activeMonthId,
    entries: state.appState.entries,
    settings: state.appState.settings,
  });
}

/** @param {HTMLElement | null} [root] */
export function mountAnalyticsView(root) {
  const analyticsRoot = getRoot(root);
  if (!analyticsRoot) return null;
  if (analyticsRoot.dataset.analyticsRendered !== "true") {
    renderAnalyticsView(analyticsRoot, { translate: t });
  }
  updateAnalyticsView(analyticsRoot, getModel(), { translate: t, formatMoney: formatSymbol, currency: state.currentCurrency });
  return analyticsRoot;
}

/** @param {HTMLElement | null} [root] */
export function refreshAnalyticsView(root) {
  const analyticsRoot = getRoot(root);
  if (!analyticsRoot) return null;
  if (analyticsRoot.dataset.analyticsRendered !== "true") return mountAnalyticsView(analyticsRoot);
  updateAnalyticsView(analyticsRoot, getModel(), { translate: t, formatMoney: formatSymbol, currency: state.currentCurrency });
  return analyticsRoot;
}
