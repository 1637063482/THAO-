import { beforeEach, describe, expect, it, vi } from "vitest";

const chartState = vi.hoisted(() => ({ instances: [] }));

vi.mock("chart.js/auto", () => ({
  default: class FakeChart {
    constructor(context, config) {
      this.context = context;
      this.config = config;
      this.data = config.data;
      this.options = config.options;
      chartState.instances.push(this);
    }

    update() {
      this.updated = true;
    }
  },
}));

describe("analytics charts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    chartState.instances.length = 0;
    document.body.innerHTML = [
      '<div class="analytics-trend-shell"><canvas id="analytics-trend-chart"></canvas></div>',
      '<div class="analytics-category-shell"><canvas id="analytics-category-chart"></canvas></div>',
    ].join("");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
  });

  it("creates a monthly trend chart and a short-label category chart", async () => {
    const { state } = await import("../../src/js/state.js");
    state.activeYear = 2026;
    state.activeMonthId = 3;
    state.currentCurrency = "VND";
    state.appState = {
      balances: {},
      entries: {
        "1_2_income": "1000",
        "1_2_dining": "100",
        "3_5_income": "800",
        "3_5_rent": "500",
      },
      settings: {},
    };

    const charts = await import("../../src/js/charts.js");
    await expect(charts.initCharts()).resolves.toBe(true);
    charts.updateCharts();
    await vi.advanceTimersByTimeAsync(300);

    expect(chartState.instances).toHaveLength(2);
    expect(chartState.instances[0].config.type).toBe("line");
    expect(chartState.instances[0].data.datasets).toHaveLength(2);
    expect(chartState.instances[1].config.type).toBe("bar");
    expect(chartState.instances[1].config.options.indexAxis).toBe("y");
    expect(chartState.instances[1].data.labels).toContain("Nhà ở");
    expect(chartState.instances[1].data.labels).not.toContain("Tiền thuê nhà & trả góp mua nhà");
  });

  it("keeps category colors attached to category ids after sorting", async () => {
    const { state } = await import("../../src/js/state.js");
    state.activeYear = 2026;
    state.activeMonthId = 1;
    state.currentCurrency = "VND";
    state.appState = {
      balances: {},
      entries: {
        "1_1_dining": "100",
        "1_1_rent": "300",
      },
      settings: {},
    };

    const charts = await import("../../src/js/charts.js");
    await charts.initCharts();
    charts.updateCharts();
    await vi.advanceTimersByTimeAsync(300);

    const categoryChart = chartState.instances[1];
    expect(categoryChart.data.labels.slice(0, 2)).toEqual(["Nhà ở", "Ăn uống"]);
    expect(categoryChart.data.datasets[0].backgroundColor.slice(0, 2)).toEqual(["#f59e0b", "#f24e3e"]);
  });
});
