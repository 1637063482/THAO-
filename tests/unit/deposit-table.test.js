import { expect, it } from "vitest";
import { renderDepositTable } from "../../src/features/deposits/deposit-table.js";

it("renders the same supplied record and action in the desktop table", () => {
  const item = { id: "active", institutionName: "Fixture Bank", productName: "1Y", principalVnd: 1000000, annualRatePpm: 50000, openedOn: "2026-01-01", maturesOn: "2027-01-01", expectedInterestVnd: 50000, status: "ACTIVE", derivedStatus: "ACTIVE", archivedAt: null };
  const html = renderDepositTable([item], { locale: "vi", labels: { institution: "Bank", amount: "Amount", rate: "Rate", interest: "Interest", opened: "Opened", matures: "Matures", status: "Status", actions: "Actions", ACTIVE: "Active" }, money: value => `VND ${value}`, productLabel: value => value, escape: value => String(value) });
  expect(html).toContain("Fixture Bank");
  expect(html).toContain('data-edit-deposit="active"');
  const template = document.createElement("template");
  template.innerHTML = html;
  expect(template.content.querySelectorAll("tbody td.blur-sensitive")).toHaveLength(4);
});
