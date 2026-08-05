import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderDepositForm, renderDepositSettlementForm } from "../../src/features/deposits/form.js";
import { buildDepositViewModel, renderDepositManagement } from "../../src/features/deposits/view.js";

const read = path => readFileSync(path, "utf8");

describe("Apple UI selector system", () => {
  it("replaces every native select with the custom Apple dropdown", () => {
    expect(read("index.html")).toContain('class="app-dropdown w-full" id="qa-day"');
    expect(read("index.html")).toContain('class="app-dropdown w-full" id="qa-cat"');
    expect(read("src/components/app-shell/header.js")).toContain('id="year-selector"');
    expect(read("src/components/app-shell/header.js")).toContain("data-app-dropdown");
    const page = renderDepositManagement(buildDepositViewModel({ document: null, today: "2026-07-31" }));
    expect(page).toContain('class="app-dropdown deposit-filter-dropdown"');
    expect(page).toContain('data-app-dropdown-option="archived"');
    const form = renderDepositForm({ id: "deposit-1" });
    expect(form).toContain('name="productName"');
    expect(form).toContain('data-app-dropdown-option="1M"');
    expect(read("index.html")).not.toContain("<select");
    expect(read("src/components/app-shell/header.js")).not.toContain("<select");
    expect(page).not.toContain("<select");
  });

  it("uses the same bank, product, and VND controls in rollover settlement", () => {
    const settlement = renderDepositSettlementForm({
      locale: "vi",
      mode: "rollover",
      today: "2026-07-31",
      deposit: { id: "deposit-1", institutionName: "Bank", productName: "1Y", principalVnd: 10_000_000, maturesOn: "2026-07-31" },
    });
    expect(settlement).toContain('data-app-dropdown-option="Vietcombank"');
    expect(settlement).toContain('data-app-dropdown-option="1M"');
    expect(settlement).toContain('name="principalVnd"');
    expect(settlement).toContain('value="10,000,000"');
    expect(settlement).toContain('name="actualInterestVnd"');
    expect(settlement).toContain('data-vnd-input');
    expect(settlement).not.toContain('<select');
  });

  it("keeps the bank picker semantic while giving its options a shared focus treatment", () => {
    const form = renderDepositForm({ id: "deposit-1" });
    const css = read("src/css/app.css");
    expect(form).toContain('role="listbox"');
    expect(form).toContain('role="option"');
    expect(form).toContain('data-app-dropdown-option="Vietcombank"');
    expect(form).toContain('class="app-dropdown deposit-bank-dropdown"');
    expect(css).toContain(".app-dropdown-option:focus-visible");
  });

  it("defines visible focus, expanded, disabled, and mobile-safe dropdown states", () => {
    const css = read("src/css/app.css");
    expect(css).toContain(".app-dropdown-trigger:focus-visible");
    expect(css).toContain('.app-dropdown-trigger[aria-expanded="true"]');
    expect(css).toContain(".app-dropdown-trigger:disabled");
    expect(css).toContain("max-height: min(56dvh, 24rem)");
    expect(css).toContain(".app-dropdown-menu.app-dropdown-menu-fixed");
  });
});
