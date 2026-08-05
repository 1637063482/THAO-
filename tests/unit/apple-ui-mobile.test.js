import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("Apple UI mobile layout (iPhone 15 Pro Max 430px)", () => {
  it("never wraps money values mid-number on deposit surfaces", () => {
    const css = read("src/features/deposits/deposits.css");
    expect(css).toContain(".deposit-metrics strong");
    expect(css).toContain("white-space: nowrap");
    expect(css).not.toContain(".deposit-metrics strong { color: var(--color-label); font-size: 1rem; overflow-wrap: anywhere;");
    expect(css).toContain(".deposit-card-amount");
    expect(css).toContain("font-variant-numeric: tabular-nums");
  });

  it("keeps deposit action rows wrapping on narrow screens", () => {
    const css = read("src/features/deposits/deposits.css");
    expect(css).toContain(".deposit-actions");
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain(".deposit-actions .btn-ghost { min-height: 44px;");
  });

  it("switches the deposit metrics to two columns below 768px", () => {
    const css = read("src/features/deposits/deposits.css");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain(".deposit-metrics { grid-template-columns: repeat(2, minmax(0,1fr)); }");
  });

  it("keeps reconciliation amounts on one line with tabular figures", () => {
    const css = read("src/css/app.css");
    expect(css).toContain("#global-initial-assets,");
    expect(css).toContain("white-space: nowrap;");
  });

  it("keeps the quick-add sheet, dropdowns, and forms inside the viewport", () => {
    const css = read("src/css/app.css");
    expect(css).toContain("#quick-add-panel");
    expect(css).toContain(".app-global-modal");
    expect(css).toContain("place-items: center");
    expect(css).toContain("max-height: calc(100dvh - 2rem)");
    expect(css).toContain("-webkit-backdrop-filter: blur(28px) saturate(135%)");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain(".app-dropdown-menu");
    expect(css).toContain("max-height: min(56dvh, 24rem)");
    expect(css).toContain(".app-dropdown-value");
    expect(css).toContain("text-overflow: ellipsis");
  });

  it("scopes the wide ledger table to an internal scroll container", () => {
    const css = read("src/css/app.css");
    expect(css).toContain(".table-scroll");
    expect(css).toContain("overflow: auto");
    expect(css).toContain(".table-card");
    expect(css).toContain("overflow: hidden");
  });

  it("keeps primary mobile controls at the 44px touch baseline", () => {
    const css = read("src/css/app.css");
    expect(css).toMatch(/\.month-tab\s*\{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.app-icon-btn\s*\{[\s\S]*?min-width:\s*44px/);
    expect(css).toMatch(/\.app-datepicker-nav\s*\{[\s\S]*?width:\s*44px/);
    expect(css).toMatch(/\.app-datepicker-day\s*\{[\s\S]*?height:\s*44px/);
    expect(css).toMatch(/\.cell-input\s*\{[\s\S]*?min-height:\s*44px/);
  });

  it("allows long Vietnamese and Chinese asset labels to wrap inside their card", () => {
    const css = read("src/css/app.css");
    expect(css).toMatch(/\.asset-label\s*\{[\s\S]*?white-space:\s*normal/);
    expect(css).toContain(".asset-label > [data-i18n]");
    expect(css).toMatch(/\.asset-label > \[data-i18n\]\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  });
});
