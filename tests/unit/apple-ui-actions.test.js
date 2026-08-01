import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderDepositCard } from "../../src/features/deposits/deposit-card.js";

const read = path => readFileSync(path, "utf8");

describe("Apple UI action hierarchy", () => {
  it("defines a visible destructive action and shared disabled or busy state", () => {
    const css = read("src/css/app.css");

    expect(css).toContain(".btn-danger");
    expect(css).toContain(".btn:disabled");
    expect(css).toContain('.btn[aria-busy="true"]');
  });

  it("keeps the quick-add action circular, flat, and touch sized", () => {
    const css = read("src/css/app.css");
    const fabRule = css.match(/#fab-btn\s*\{([\s\S]*?)\n\}/)?.[1] || "";

    expect(fabRule).toContain("width: 56px");
    expect(fabRule).toContain("height: 56px");
    expect(fabRule).toContain("border-radius: 50%");
    expect(fabRule).not.toContain("linear-gradient");
  });

  it("renders deposit delete and archive actions as destructive buttons", () => {
    const html = renderDepositCard({
      id: "deposit-1",
      archivedAt: null,
      status: "ACTIVE",
      derivedStatus: "ACTIVE",
      institutionName: "Bank",
      productName: "TERM_12_MONTHS",
      principalVnd: 1000000,
      annualRatePpm: 50000,
      maturesOn: "2026-12-31",
      expectedInterestVnd: 10000,
    }, {
      locale: "vi",
      labels: { edit: "Edit", delete: "Delete", archive: "Archive" },
      money: value => String(value),
      productLabel: value => value,
      escape: value => value,
    });

    expect(html).toContain('class="btn-danger" data-delete-deposit="deposit-1"');
    expect(html).toContain('class="btn-danger" data-archive-deposit="deposit-1"');
  });
});
