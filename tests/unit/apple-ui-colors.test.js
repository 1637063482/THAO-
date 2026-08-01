import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("Apple UI semantic color contract", () => {
  it("removes confirmed business color residues while retaining tokenized roles", () => {
    const css = read("src/css/app.css");
    const savings = read("src/features/savings/view.js");
    const render = read("src/js/render.js");
    const budget = read("src/js/budget.js");
    const sync = read("src/js/sync.js");

    expect(css).toContain("--color-income:");
    expect(css).toContain("--color-expense:");
    expect(css).toContain("--color-balance:");
    expect(css).toContain("--color-budget-caution:");
    expect(css).not.toContain("#f8e7c4");
    expect(css).not.toContain("#64748b");
    expect(css).not.toMatch(/@apply\s+text-(rose|emerald|indigo)-/);
    expect(savings).not.toContain("text-rose-600");
    expect(render).not.toMatch(/style=\\\"color:#(?:10b981|ef4444)/);
    expect(budget).not.toMatch(/#(?:dc2626|d97706|059669|64748b)/i);
    expect(sync).not.toMatch(/bg-(yellow|emerald|red)-|text-(yellow|emerald|red)-|border-(yellow|emerald|red)-/);
  });
});
