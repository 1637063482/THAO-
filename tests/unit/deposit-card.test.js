import { expect, it } from "vitest";
import { renderDepositCard } from "../../src/features/deposits/deposit-card.js";

it("renders a card with the supplied fields and terminal actions", () => {
  const html = renderDepositCard({ id: "done", institutionName: "Fixture Bank", productName: "1Y", principalVnd: 1000000, annualRatePpm: 50000, maturesOn: "2027-01-01", expectedInterestVnd: 50000, status: "REDEEMED", derivedStatus: "REDEEMED", archivedAt: null, actualInterestVnd: 50000, interestRecorded: false }, { locale: "vi", labels: { rate: "Rate", matures: "Matures", interest: "Interest", REDEEMED: "Redeemed" }, money: value => `VND ${value}`, productLabel: value => value, escape: value => String(value) });
  expect(html).toContain("Fixture Bank");
  expect(html).toContain('data-record-interest="done"');
  expect(html).not.toContain('data-delete-deposit="done"');
});
