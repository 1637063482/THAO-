import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderDepositForm, renderDepositSettlementForm } from "../../src/features/deposits/form.js";

const css = readFileSync("src/features/deposits/deposits.css", "utf8");
const deposit = { id: "deposit-1", institutionName: "Bank", productName: "TERM_6M", principalVnd: 1000000, annualRatePpm: 50000, openedOn: "2026-07-01", maturesOn: "2027-01-01", expectedInterestVnd: 25000 };

describe("Apple UI switches", () => {
  it("keeps reminder and interest controls as native checkboxes for keyboard and screen readers", () => {
    expect(renderDepositForm({ id: "deposit-1" })).toContain('name="remindersEnabled" type="checkbox"');
    expect(renderDepositSettlementForm({ deposit, today: "2026-07-31" })).toContain('name="writeInterestToLedger" type="checkbox"');
  });

  it("supplies iOS switch geometry and checked, focus, and disabled states", () => {
    expect(css).toContain('.deposit-reminder-toggle input[type="checkbox"]');
    expect(css).toContain("border-radius: 999px");
    expect(css).toContain(':checked::after');
    expect(css).toContain(":focus-visible");
    expect(css).toContain(":disabled");
  });
});
