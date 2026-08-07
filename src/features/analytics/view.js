import { t as defaultTranslate } from "../../js/i18n.js";
import { formatSymbol } from "../../js/utils.js";

function staticMarkup() {
  return `
    <div class="analytics-page">
      <section class="analytics-card analytics-summary-card" aria-labelledby="analytics-summary-title">
        <header class="analytics-section-heading">
          <div>
            <p class="analytics-eyebrow" data-i18n="analysis_overview"></p>
            <h2 id="analytics-summary-title" data-i18n="analysis_summary"></h2>
          </div>
          <span class="analytics-year-badge" id="analytics-year"></span>
        </header>
        <div class="analytics-summary-grid">
          <div class="analytics-kpi analytics-kpi-income"><span class="analytics-kpi-label" data-i18n="yearly_income"></span><strong id="analytics-yearly-income" class="blur-sensitive"></strong></div>
          <div class="analytics-kpi analytics-kpi-expense"><span class="analytics-kpi-label" data-i18n="yearly_expense"></span><strong id="analytics-yearly-expense" class="blur-sensitive"></strong></div>
          <div class="analytics-kpi analytics-kpi-net"><span class="analytics-kpi-label" data-i18n="net_cash_flow"></span><strong id="analytics-yearly-net" class="blur-sensitive"></strong></div>
          <div class="analytics-kpi analytics-kpi-rate"><span class="analytics-kpi-label" data-i18n="analysis_savings_rate"></span><strong id="analytics-savings-rate"></strong></div>
        </div>
        <div class="analytics-metric-grid">
          <div><span data-i18n="analysis_recorded_days"></span><strong id="analytics-recorded-days"></strong></div>
          <div><span data-i18n="analysis_expense_days"></span><strong id="analytics-expense-days"></strong></div>
          <div><span data-i18n="analysis_average_expense"></span><strong id="analytics-average-expense" class="blur-sensitive"></strong></div>
          <div><span data-i18n="analysis_peak_day"></span><strong id="analytics-peak-day" class="blur-sensitive"></strong></div>
        </div>
      </section>

      <section class="analytics-card analytics-chart-card" aria-labelledby="analytics-trend-title">
        <header class="analytics-section-heading">
          <div><p class="analytics-eyebrow" data-i18n="analysis_trend"></p><h2 id="analytics-trend-title" data-i18n="analysis_monthly_trend"></h2></div>
          <span id="analytics-currency-note" class="analytics-section-note"></span>
        </header>
        <div class="analytics-chart-shell analytics-trend-shell privacy-sensitive-chart"><canvas id="analytics-trend-chart" role="img" aria-describedby="analytics-trend-summary"></canvas></div>
        <p id="analytics-trend-summary" class="sr-only"></p>
      </section>

      <section class="analytics-card analytics-chart-card" aria-labelledby="analytics-category-title">
        <header class="analytics-section-heading">
          <div><p class="analytics-eyebrow" data-i18n="analysis_breakdown"></p><h2 id="analytics-category-title" data-i18n="analysis_category_breakdown"></h2></div>
          <span class="analytics-section-note" data-i18n="analysis_top_five"></span>
        </header>
        <div class="analytics-chart-shell analytics-category-shell privacy-sensitive-chart"><canvas id="analytics-category-chart" role="img" aria-describedby="analytics-category-summary"></canvas></div>
        <div id="analytics-category-list" class="analytics-category-list"></div>
        <p id="analytics-category-summary" class="sr-only"></p>
      </section>

      <section class="analytics-card" aria-labelledby="analytics-budget-title">
        <header class="analytics-section-heading">
          <div><p class="analytics-eyebrow" data-i18n="analysis_budget"></p><h2 id="analytics-budget-title" data-i18n="analysis_budget_execution"></h2></div>
        </header>
        <div class="analytics-budget-summary">
          <div><span data-i18n="analysis_budget_usage"></span><strong id="analytics-budget-usage"></strong></div>
          <div><span data-i18n="analysis_budget_months"></span><strong id="analytics-budget-months"></strong></div>
          <div><span data-i18n="analysis_budget_total"></span><strong id="analytics-budget-total" class="blur-sensitive"></strong></div>
        </div>
        <div id="analytics-budget-list" class="analytics-budget-list"></div>
      </section>

      <section id="analytics-monthly-detail" class="analytics-card" aria-labelledby="analytics-monthly-title">
        <header class="analytics-section-heading">
          <div><p class="analytics-eyebrow" data-i18n="analysis_monthly_detail"></p><h2 id="analytics-monthly-title"></h2></div>
        </header>
        <div class="analytics-monthly-summary">
          <div><span data-i18n="monthly_income"></span><strong id="analytics-monthly-income" class="blur-sensitive"></strong></div>
          <div><span data-i18n="monthly_expense"></span><strong id="analytics-monthly-expense" class="blur-sensitive"></strong></div>
          <div><span data-i18n="net_cash_flow"></span><strong id="analytics-monthly-net" class="blur-sensitive"></strong></div>
          <div><span data-i18n="analysis_budget_usage"></span><strong id="analytics-monthly-budget"></strong></div>
        </div>
        <div id="analytics-monthly-category-list" class="analytics-category-list"></div>
      </section>
    </div>`;
}

/** @param {HTMLElement | null} root @param {{translate?: (key: string, params?: Record<string, unknown>) => string, currency?: "VND" | "CNY"}} [options] */
export function renderAnalyticsView(root, options = {}) {
  if (!root) return;
  root.innerHTML = staticMarkup();
  root.dataset.analyticsRendered = "true";
  const translate = options.translate || defaultTranslate;
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.getAttribute("data-i18n") || "");
  });
  setText(root, "analytics-currency-note", translate("analysis_currency_source", { currency: options.currency || "VND" }));
}

function setText(root, id, value) {
  const element = root.querySelector("#" + id);
  if (element) element.textContent = String(value);
  return element;
}

function setSignedClass(element, value) {
  if (!element) return;
  element.classList.remove("balance-positive", "balance-negative", "balance-neutral");
  element.classList.add(value > 0 ? "balance-positive" : value < 0 ? "balance-negative" : "balance-neutral");
}

function percentage(value, translate) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? translate("not_available")
    : (value * 100).toFixed(1) + "%";
}

function budgetPercentage(value, translate) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? translate("not_available")
    : value.toFixed(1) + "%";
}

function createCategoryRow(category, translate, formatMoney) {
  const row = document.createElement("div");
  row.className = "analytics-category-row";
  row.dataset.categoryId = category.id;

  const label = document.createElement("span");
  label.className = "analytics-category-label";
  label.textContent = translate(category.labelKey);
  label.title = translate(category.labelKey);

  const track = document.createElement("span");
  track.className = "analytics-category-track";
  const bar = document.createElement("span");
  bar.className = "analytics-category-bar";
  bar.style.width = Math.max(0, Math.min(100, category.share * 100)) + "%";
  bar.style.backgroundColor = category.color;
  track.appendChild(bar);

  const value = document.createElement("span");
  value.className = "analytics-category-value blur-sensitive";
  value.textContent = formatMoney(category.value) + " \u00b7 " + (category.share * 100).toFixed(1) + "%";

  row.append(label, track, value);
  return row;
}

function renderCategoryRows(root, id, categories, translate, formatMoney) {
  const container = root.querySelector("#" + id);
  if (!container) return;
  container.replaceChildren();
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "analytics-empty-state";
    empty.textContent = translate("no_data");
    container.appendChild(empty);
    return;
  }
  categories.forEach((category) => container.appendChild(createCategoryRow(category, translate, formatMoney)));
}

function renderBudgetRows(root, months, translate, formatMoney) {
  const container = root.querySelector("#analytics-budget-list");
  if (!container) return;
  container.replaceChildren();
  const visibleMonths = months.filter((month) => month.recordedDays > 0);
  if (!visibleMonths.length) {
    const empty = document.createElement("p");
    empty.className = "analytics-empty-state";
    empty.textContent = translate("no_data");
    container.appendChild(empty);
    return;
  }
  visibleMonths.forEach((month) => {
    const row = document.createElement("div");
    row.className = "analytics-budget-row";
    const label = document.createElement("span");
    label.textContent = translate("month_short", { month: month.month });
    const progress = document.createElement("span");
    progress.className = "analytics-budget-track";
    const bar = document.createElement("span");
    bar.className = "analytics-budget-bar";
    bar.style.width = Math.min(100, Math.max(0, month.budgetUsedPercent || 0)) + "%";
    bar.classList.add(month.budgetUsedPercent > 100 ? "is-over" : month.budgetUsedPercent >= 90 ? "is-warning" : "is-safe");
    progress.appendChild(bar);
    const value = document.createElement("span");
    value.className = "analytics-budget-value blur-sensitive";
    value.textContent = budgetPercentage(month.budgetUsedPercent, translate) + " · " + formatMoney(month.expense);
    row.append(label, progress, value);
    container.appendChild(row);
  });
}

/**
 * Update text/list projections without replacing chart canvases.
 * @param {HTMLElement | null} root
 * @param {any} model
 * @param {{translate?: (key: string, params?: Record<string, unknown>) => string, formatMoney?: (value: number) => string, currency?: "VND" | "CNY"}} [options]
 */
export function updateAnalyticsView(root, model, options = {}) {
  if (!root || !model) return;
  const translate = options.translate || defaultTranslate;
  const formatMoney = options.formatMoney || formatSymbol;
  setText(root, "analytics-currency-note", translate("analysis_currency_source", { currency: options.currency || "VND" }));
  const annual = model.annual;
  const month = model.activeMonth;
  setText(root, "analytics-year", model.year);
  setText(root, "analytics-yearly-income", formatMoney(annual.income));
  setText(root, "analytics-yearly-expense", formatMoney(annual.expense));
  const net = setText(root, "analytics-yearly-net", formatMoney(annual.net));
  setSignedClass(net, annual.net);
  setText(root, "analytics-savings-rate", percentage(annual.savingsRate, translate));
  setText(root, "analytics-recorded-days", annual.recordedDays);
  setText(root, "analytics-expense-days", annual.expenseDays);
  setText(root, "analytics-average-expense", formatMoney(annual.averageExpensePerExpenseDay));
  setText(root, "analytics-peak-day", annual.peakExpenseDay
    ? translate("month_day", { month: annual.peakExpenseDay.month, day: annual.peakExpenseDay.day }) + " · " + formatMoney(annual.peakExpenseDay.amount)
    : translate("not_available"));

  setText(root, "analytics-budget-usage", budgetPercentage(annual.budget.usedPercent, translate));
  setText(root, "analytics-budget-months", annual.budget.monthsWithinBudget + "/" + annual.budget.monthsWithData);
  setText(root, "analytics-budget-total", formatMoney(annual.budget.total));
  setText(root, "analytics-monthly-title", translate("monthly", { month: month.month }));
  setText(root, "analytics-monthly-income", formatMoney(month.income));
  setText(root, "analytics-monthly-expense", formatMoney(month.expense));
  const monthlyNet = setText(root, "analytics-monthly-net", formatMoney(month.net));
  setSignedClass(monthlyNet, month.net);
  setText(root, "analytics-monthly-budget", budgetPercentage(month.budgetUsedPercent, translate));

  const annualTopCategories = annual.topCategories || annual.categories || [];
  const monthlyTopCategories = month.topCategories || month.categories || [];
  const months = model.months || [];
  renderCategoryRows(root, "analytics-category-list", annualTopCategories, translate, formatMoney);
  renderCategoryRows(root, "analytics-monthly-category-list", monthlyTopCategories, translate, formatMoney);
  renderBudgetRows(root, months, translate, formatMoney);
  setText(root, "analytics-trend-summary", months.map((item) => translate("month_short", { month: item.month }) + ": " + formatMoney(item.expense)).join("; "));
  setText(root, "analytics-category-summary", annualTopCategories.map((item) => translate(item.labelKey) + ": " + formatMoney(item.value)).join("; "));
}
