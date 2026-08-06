import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderDepositForm } from "../../src/features/deposits/form.js";
import { buildSavingsViewModel, renderSavingsPage } from "../../src/features/savings/view.js";
import { renderMonthTable } from "../../src/js/render.js";
import { state } from "../../src/js/state.js";

const read = path => readFileSync(path, "utf8");

describe("Apple UI input system", () => {
  it("defines one shared field contract for normal, invalid, readonly, and numeric inputs", () => {
    const css = read("src/css/app.css");

    expect(css).toContain(".app-form-control");
    expect(css).toContain(".app-form-control:focus");
    expect(css).toContain(".app-form-control:invalid");
    expect(css).toContain(".app-form-control:read-only");
    expect(css).toContain("font-variant-numeric: tabular-nums");
  });

  it("applies the shared contract to savings and deposit text or amount fields", () => {
    const savings = renderSavingsPage(buildSavingsViewModel({ month: 1 }));
    const deposit = renderDepositForm({ id: "deposit-1" });

    expect(savings).toContain('name="monthly"');
    expect(deposit).toContain('name="principalVnd"');
    expect(deposit).toContain('name="annualRatePercent"');
    const css = read("src/css/app.css");
    expect(css).toContain(".savings-goal-form input");
    expect(css).toContain(".deposit-form-grid input");
    expect(css).toContain(".privacy-mode .savings-goal-form input.savings-goal-input:not(:focus)");
  });

  it("keeps the inline ledger and budget inputs in the shared input visual system", () => {
    const css = read("src/css/app.css");

    expect(css).toContain(".cell-input,");
    expect(css).toContain(".budget-inline-input");
  });

  it("lets the remark column use the same auto table sizing as the income column", () => {
    const css = read("src/css/app.css");
    const remarkColumnRule = css.match(/\.remark-col\s*\{([^}]*)\}/)?.[1] || "";

    expect(remarkColumnRule).not.toMatch(/width:\s*8%/);
    expect(remarkColumnRule).toMatch(/min-width:\s*64px/);
  });

  it("associates static and dynamic ledger fields with meaningful accessible names", () => {
    const html = read("index.html");
    ["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"].forEach(id => {
      expect(html).toMatch(new RegExp(`<label[^>]+for=["']${id}["']`));
    });
    expect(html).toContain('id="qa-day-label"');
    expect(html).toContain('aria-labelledby="qa-day-label"');
    expect(html).toContain('id="qa-cat-label"');
    expect(html).toContain('aria-labelledby="qa-cat-label"');
    expect(html).toContain('for="qa-amount"');
    expect(html).toContain('for="qa-remark"');

    document.body.innerHTML = '<div id="months-container"></div>';
    state.activeYear = 2026;
    state.activeMonthId = 1;
    state.appState = { balances: {}, entries: {}, settings: {} };
    renderMonthTable(1);
    expect(document.querySelector('[id="entry-1-1-dining"]').getAttribute("aria-label")).toContain("1/1");
    expect(document.querySelector('[id="entry-1-1-remark"]').getAttribute("aria-label")).toContain("Ghi chú");
    expect(document.getElementById("monthly-budget-input").getAttribute("aria-label")).toBeTruthy();
  });
});
