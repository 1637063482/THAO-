import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderDepositForm, renderDepositSettlementForm } from "../../src/features/deposits/form.js";

const read = path => readFileSync(path, "utf8");
const deposit = {
  id: "deposit-1", institutionName: "Bank", productName: "TERM_6M", principalVnd: 1000000,
  annualRatePpm: 50000, openedOn: "2026-07-01", maturesOn: "2027-01-01", expectedInterestVnd: 25000,
};

describe("Apple UI date system", () => {
  it("replaces native date inputs with the custom Apple date picker", () => {
    const form = renderDepositForm({ id: "deposit-1", locale: "vi" });
    expect(form).not.toContain('type="date"');
    expect(form).toContain("data-app-datepicker");
    expect(form).toContain('name="openedOn"');
    expect(form).toContain('name="maturesOn"');
    const settled = renderDepositSettlementForm({ locale: "vi", deposit, today: "2026-07-31" });
    expect(settled).not.toContain('type="date"');
    expect(settled).toContain('name="settledOn"');
  });

  it("shows localized placeholders and stored values in the trigger", () => {
    const zh = renderDepositForm({ id: "deposit-1", locale: "zh-CN", deposit: { ...deposit } });
    expect(zh).toContain("data-app-datepicker-placeholder=\"年/月/日\"");
    expect(zh).toContain("2026/07/01");
    const vi = renderDepositForm({ id: "deposit-1", locale: "vi", deposit: { ...deposit } });
    expect(vi).toContain("data-app-datepicker-placeholder=\"ngày/tháng/năm\"");
    expect(vi).toContain("01/07/2026");
  });

  it("constrains the settlement date to the maturity date", () => {
    const settled = renderDepositSettlementForm({ locale: "vi", deposit, today: "2026-07-31" });
    expect(settled).toContain(`data-app-datepicker-min="${deposit.maturesOn}"`);
  });

  it("styles the calendar as an Apple surface with no native input residue", () => {
    const css = read("src/css/app.css");
    expect(css).toContain(".app-datepicker-calendar");
    expect(css).toContain(".app-datepicker-day.is-selected");
    expect(css).toContain(".app-datepicker-day.is-today");
    expect(css).not.toContain('input[type="date"]');
    const depositCss = read("src/features/deposits/deposits.css");
    expect(depositCss).not.toContain(".deposit-date-control");
  });
});
