import { describe, expect, it } from "vitest";

import { renderAnalyticsView, updateAnalyticsView } from "../../src/features/analytics/view.js";

describe("analytics view", () => {
  it("renders summary, trend, category, budget, and monthly detail regions", () => {
    document.body.innerHTML = '<div id="analysis-root"></div>';

    renderAnalyticsView(document.getElementById("analysis-root"), {
      translate: (key) => key,
      formatMoney: (value) => String(value),
    });

    const root = document.getElementById("analysis-root");
    expect(root.querySelector(".analytics-summary-grid")).not.toBeNull();
    expect(root.querySelector("#analytics-trend-chart")).not.toBeNull();
    expect(root.querySelector("#analytics-category-chart")).not.toBeNull();
    expect(root.querySelector("#analytics-budget-list")).not.toBeNull();
    expect(root.querySelector("#analytics-monthly-detail")).not.toBeNull();
    expect(root.querySelector("#yearly-legend")).toBeNull();
    expect(root.querySelector("#monthly-legend")).toBeNull();
  });

  it("updates visible metrics and category labels without replacing chart canvases", async () => {
    document.body.innerHTML = '<div id="analysis-root"></div>';
    const root = document.getElementById("analysis-root");
    renderAnalyticsView(root, { translate: (key) => key, formatMoney: (value) => String(value) });
    const trendCanvas = root.querySelector("#analytics-trend-chart");

    updateAnalyticsView(root, {
      year: 2026,
      activeMonth: 3,
      annual: {
        income: 1000,
        expense: 400,
        net: 600,
        savingsRate: 0.6,
        recordedDays: 2,
        expenseDays: 2,
        averageExpensePerExpenseDay: 200,
        peakExpenseDay: { month: 3, day: 2, dateKey: "2026-03-02", amount: 300 },
        categories: [{ id: "dining", labelKey: "category_dining", shortLabelKey: "category_dining_short", value: 400, share: 1, color: "#f24e3e" }],
        topCategories: [{ id: "dining", labelKey: "category_dining", shortLabelKey: "category_dining_short", value: 400, share: 1, color: "#f24e3e" }],
        budget: { total: 1000, usedPercent: 40, monthsWithData: 1, monthsWithinBudget: 1 },
      },
      months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, income: 0, expense: 0, net: 0, budget: 1000, budgetUsedPercent: 0 })),
      activeMonth: {
        month: 3,
        income: 1000,
        expense: 400,
        net: 600,
        budget: 1000,
        budgetUsedPercent: 40,
        categories: [{ id: "dining", labelKey: "category_dining", shortLabelKey: "category_dining_short", value: 400, share: 1, color: "#f24e3e" }],
        topCategories: [{ id: "dining", labelKey: "category_dining", shortLabelKey: "category_dining_short", value: 400, share: 1, color: "#f24e3e" }],
      },
    }, { translate: (key) => key, formatMoney: (value) => String(value) });

    expect(root.querySelector("#analytics-yearly-income").textContent).toBe("1000");
    expect(root.querySelector("#analytics-monthly-detail").textContent).toContain("category_dining");
    expect(root.querySelector("#analytics-trend-chart")).toBe(trendCanvas);
  });

  it("updates the trend note when the selected currency changes", () => {
    document.body.innerHTML = '<div id="analysis-root"></div>';
    const root = document.getElementById("analysis-root");
    const translate = (key, params) => key === "analysis_currency_source"
      ? "unit " + params.currency
      : key;
    const model = {
      year: 2026,
      activeMonth: { month: 1, income: 0, expense: 0, net: 0, budget: 0, budgetUsedPercent: null, categories: [], topCategories: [] },
      annual: {
        income: 0,
        expense: 0,
        net: 0,
        savingsRate: null,
        recordedDays: 0,
        expenseDays: 0,
        averageExpensePerExpenseDay: 0,
        peakExpenseDay: null,
        categories: [],
        topCategories: [],
        budget: { total: 0, usedPercent: null, monthsWithData: 0, monthsWithinBudget: 0 },
      },
      months: [],
    };

    renderAnalyticsView(root, { translate, formatMoney: (value) => String(value) });
    updateAnalyticsView(root, model, { translate, formatMoney: (value) => String(value), currency: "CNY" });
    expect(root.querySelector("#analytics-currency-note").textContent).toBe("unit CNY");

    updateAnalyticsView(root, model, { translate, formatMoney: (value) => String(value), currency: "VND" });
    expect(root.querySelector("#analytics-currency-note").textContent).toBe("unit VND");
  });
});
