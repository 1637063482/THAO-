import { beforeEach, describe, expect, it } from "vitest";
import { state } from "../../src/js/state.js";
import { renderMonthTable } from "../../src/js/render.js";

describe("month table rendering", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="months-container"></div><span id="monthly-chart-title"></span>';
    state.activeYear = 2026;
    state.activeMonthId = 1;
    state.currentCurrency = "VND";
    state.appState = { balances: {}, entries: {}, settings: {} };
  });

  it.each([
    ['"><img src=x onerror="window.__xss=1">', "remark"],
    ['" autofocus onfocus="window.__xss=1', "dining"],
    ["第一行\n第二行🙂", "remark"],
  ])("keeps untrusted %s as an input value", (payload, field) => {
    const key = `1_1_${field}`;
    state.appState.entries[key] = payload;

    renderMonthTable(1);

    const input = document.querySelector(`[data-key="${key}"]`);
    expect(input).not.toBeNull();
    expect(input.dataset.raw).toBe(payload);
    const expectedValue = field === "remark" ? payload.replace(/[\r\n]/g, "") : "0";
    expect(input.value).toBe(expectedValue);
    expect(document.querySelector("img")).toBeNull();
    expect(input.hasAttribute("onfocus")).toBe(false);
  });
});
