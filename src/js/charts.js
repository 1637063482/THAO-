import { state } from "./state.js";
import { expenseCategories } from "./config.js";
import { formatSymbol, getActiveRate } from "./utils.js";
import { isValidCurrencyRate } from "./currency-view.js";
import { t } from "./i18n.js";

let yearlyChart = null;
let monthlyChart = null;
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

const COLORS = [
  "#D97706", "#6366F1", "#059669", "#DC2626", "#F59E0B",
  "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#6B7280"
];
const COLORS_ALPHA = [
  "rgba(217,119,6,0.85)", "rgba(99,102,241,0.85)", "rgba(5,150,105,0.85)", "rgba(220,38,38,0.85)", "rgba(245,158,11,0.85)",
  "rgba(139,92,246,0.85)", "rgba(6,182,212,0.85)", "rgba(249,115,22,0.85)", "rgba(236,73,153,0.85)", "rgba(107,114,128,0.85)"
];

function makeDataset(data) {
  return {
    data: data,
    backgroundColor: COLORS_ALPHA,
    borderColor: COLORS,
    borderWidth: 1,
    borderRadius: 4,
    barThickness: 18,
  };
}

function makeOptions(title) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.95)",
        titleFont: { size: 13, weight: "700" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: function (ctx) {
            var val = ctx.parsed.x;
            if (!val || val <= 0) return "  " + t("no_data");
            var total = 0;
            ctx.dataset.data.forEach(function (v) { total += v; });
            var p = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return "  " + formatSymbol(val) + "  (" + p + "%)";
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function (val) {
            if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
            if (val >= 1000) return (val / 1000).toFixed(0) + "K";
            return Math.round(val);
          },
          font: { size: 10 },
        },
        grid: { color: "rgba(0,0,0,0.04)" },
      },
      y: {
        ticks: {
          font: { size: 12, weight: "500" },
          color: "#475569",
        },
        grid: { display: false },
      },
    },
  };
}

export async function initCharts() {
  var ctxY = document.getElementById("yearlyChart")?.getContext("2d");
  var ctxM = document.getElementById("monthlyChart")?.getContext("2d");
  if (!ctxY || !ctxM) return false;
  let Chart;
  try {
    Chart = await loadChartLibrary();
  } catch {
    return false;
  }

  var labels = expenseCategories.map(function (c) { return t(c.nameKey); });

  yearlyChart = new Chart(ctxY, {
    type: "bar",
    data: { labels: labels.slice(), datasets: [makeDataset(labels.map(function () { return 0; }))] },
    options: makeOptions(),
  });

  monthlyChart = new Chart(ctxM, {
    type: "bar",
    data: { labels: labels.slice(), datasets: [makeDataset(labels.map(function () { return 0; }))] },
    options: makeOptions(),
  });

  drawLegend("yearly-legend");
  drawLegend("monthly-legend");
  return true;
}

function drawLegend(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var h = '<div class="flex flex-wrap gap-1.5 justify-center">';
  expenseCategories.forEach(function (c, i) {
    var name = t(c.nameKey);
    h += '<span class="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">';
    h += '<span style="width:10px;height:10px;border-radius:3px;background:' + COLORS[i] + ';flex-shrink:0;"></span>';
    h += name + "</span>";
  });
  h += "</div>";
  el.innerHTML = h;
}

export function updateCharts() {
  clearTimeout(chartTimeout);
  chartTimeout = setTimeout(function () {
    var rate = getActiveRate();
    var canConvert = state.currentCurrency === "VND" || isValidCurrencyRate(rate);

    // Build year data with labels, sorted desc
    var yearEntries = expenseCategories.map(function (c) {
      var v = state.yearlyCatSums[c.id] || 0;
      return { label: t(c.nameKey), value: state.currentCurrency === "VND" ? Math.round(v) : canConvert ? +(v / rate).toFixed(2) : 0 };
    });
    yearEntries.sort(function (a, b) { return b.value - a.value; });

    if (yearlyChart) {
      yearlyChart.data.labels = yearEntries.map(function (e) { return e.label; });
      yearlyChart.data.datasets[0].data = yearEntries.map(function (e) { return e.value; });
      yearlyChart.update();
    }

    // Monthly data sorted desc
    var mobj = state.monthlyCatSums[state.activeMonthId] || {};
    var monthEntries = expenseCategories.map(function (c) {
      var v = mobj[c.id] || 0;
      return { label: t(c.nameKey), value: state.currentCurrency === "VND" ? Math.round(v) : canConvert ? +(v / rate).toFixed(2) : 0 };
    });
    monthEntries.sort(function (a, b) { return b.value - a.value; });

    if (monthlyChart) {
      monthlyChart.data.labels = monthEntries.map(function (e) { return e.label; });
      monthlyChart.data.datasets[0].data = monthEntries.map(function (e) { return e.value; });
      monthlyChart.update();
    }
  }, 300);
}
