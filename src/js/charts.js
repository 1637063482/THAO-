import { state } from "./state.js";
import { formatSymbol, getActiveRate } from "./utils.js";
import { isValidCurrencyRate } from "./currency-view.js";
import { t } from "./i18n.js";
import { buildAnalyticsViewModel } from "../features/analytics/model.js";

let trendChart = null;
let categoryChart = null;
let chartTimeout = null;
let chartLibraryPromise = null;

function loadChartLibrary() {
  if (!chartLibraryPromise) {
    chartLibraryPromise = import("chart.js/auto")
      .then((module) => module.default)
      .catch((error) => {
        chartLibraryPromise = null;
        throw error;
      });
  }
  return chartLibraryPromise;
}

function getAnalyticsModel() {
  return buildAnalyticsViewModel({
    year: state.activeYear,
    activeMonth: state.activeMonthId,
    entries: state.appState.entries,
    settings: state.appState.settings,
  });
}

function toChartValue(vndValue) {
  const value = Number(vndValue) || 0;
  if (state.currentCurrency === "VND") return Math.round(value);
  const rate = getActiveRate();
  return isValidCurrencyRate(rate) ? +(value / rate).toFixed(2) : 0;
}

function formatAxisValue(value) {
  if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + "K";
  return Math.round(value);
}

function makeBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    layout: { padding: { top: 4, right: 8, bottom: 4, left: 4 } },
    plugins: {
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        titleFont: { size: 13, weight: "700" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 10,
      },
    },
  };
}

function makeTrendOptions() {
  const options = makeBaseOptions();
  options.interaction = { mode: "index", intersect: false };
  options.plugins.legend = {
    display: true,
    position: "bottom",
    labels: { usePointStyle: true, boxWidth: 8, padding: 16 },
  };
  options.plugins.tooltip.callbacks = {
    label: function (context) {
      const rawValue = context.dataset.vndData?.[context.dataIndex] || 0;
      return "  " + context.dataset.label + ": " + formatSymbol(rawValue);
    },
  };
  options.scales = {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b", font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(100,116,139,0.12)" },
      ticks: { color: "#64748b", font: { size: 10 }, callback: formatAxisValue },
    },
  };
  return options;
}

function makeCategoryOptions() {
  const options = makeBaseOptions();
  options.indexAxis = "y";
  options.plugins.legend = { display: false };
  options.plugins.tooltip.callbacks = {
    title: function (contexts) {
      const context = contexts[0];
      return context.dataset.fullLabels?.[context.dataIndex] || context.label;
    },
    label: function (context) {
      const rawValue = context.dataset.vndData?.[context.dataIndex] || 0;
      const share = context.dataset.shares?.[context.dataIndex] || 0;
      return "  " + formatSymbol(rawValue) + "  (" + (share * 100).toFixed(1) + "%)";
    },
  };
  options.scales = {
    x: {
      beginAtZero: true,
      grid: { color: "rgba(100,116,139,0.12)" },
      ticks: { color: "#64748b", font: { size: 10 }, callback: formatAxisValue },
    },
    y: {
      grid: { display: false },
      ticks: { color: "#475569", font: { size: 11, weight: "600" } },
    },
  };
  return options;
}

function updateTrendChart(model) {
  if (!trendChart) return;
  const labels = model.months.map((month) => t("month_short", { month: month.month }));
  const income = model.months.map((month) => month.income);
  const expense = model.months.map((month) => month.expense);
  trendChart.data.labels = labels;
  trendChart.data.datasets[0].label = t("income");
  trendChart.data.datasets[0].data = income.map(toChartValue);
  trendChart.data.datasets[0].vndData = income;
  trendChart.data.datasets[1].label = t("expense");
  trendChart.data.datasets[1].data = expense.map(toChartValue);
  trendChart.data.datasets[1].vndData = expense;
  trendChart.update();
}

function updateCategoryChart(model) {
  if (!categoryChart) return;
  const categories = model.annual.topCategories;
  const visibleCategories = categories.length ? categories : [{
    id: "no-data",
    labelKey: "no_data",
    shortLabelKey: "no_data",
    value: 0,
    share: 0,
    color: "#94a3b8",
  }];
  categoryChart.data.labels = visibleCategories.map((category) => t(category.shortLabelKey));
  categoryChart.data.datasets[0].data = visibleCategories.map((category) => toChartValue(category.value));
  categoryChart.data.datasets[0].vndData = visibleCategories.map((category) => category.value);
  categoryChart.data.datasets[0].fullLabels = visibleCategories.map((category) => t(category.labelKey));
  categoryChart.data.datasets[0].shares = visibleCategories.map((category) => category.share);
  categoryChart.data.datasets[0].backgroundColor = visibleCategories.map((category) => category.color);
  categoryChart.data.datasets[0].borderColor = visibleCategories.map((category) => category.color);
  categoryChart.update();
}

export async function initCharts() {
  const trendCanvas = document.getElementById("analytics-trend-chart");
  const categoryCanvas = document.getElementById("analytics-category-chart");
  const trendContext = trendCanvas?.getContext("2d");
  const categoryContext = categoryCanvas?.getContext("2d");
  if (!trendContext || !categoryContext) return false;

  let Chart;
  try {
    Chart = await loadChartLibrary();
  } catch {
    return false;
  }

  trendChart?.destroy?.();
  categoryChart?.destroy?.();

  trendChart = new Chart(trendContext, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: t("income"),
          data: [],
          vndData: [],
          borderColor: "#b4233f",
          backgroundColor: "rgba(180,35,63,0.12)",
          pointBackgroundColor: "#b4233f",
          pointRadius: 3,
          tension: 0.3,
          fill: true,
        },
        {
          label: t("expense"),
          data: [],
          vndData: [],
          borderColor: "#087443",
          backgroundColor: "rgba(8,116,67,0.1)",
          pointBackgroundColor: "#087443",
          pointRadius: 3,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: makeTrendOptions(),
  });

  categoryChart = new Chart(categoryContext, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        data: [],
        vndData: [],
        fullLabels: [],
        shares: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 20,
      }],
    },
    options: makeCategoryOptions(),
  });

  updateTrendChart(getAnalyticsModel());
  updateCategoryChart(getAnalyticsModel());
  return true;
}

export function updateCharts() {
  clearTimeout(chartTimeout);
  chartTimeout = setTimeout(() => {
    if (!trendChart || !categoryChart) return;
    const model = getAnalyticsModel();
    updateTrendChart(model);
    updateCategoryChart(model);
  }, 300);
}
