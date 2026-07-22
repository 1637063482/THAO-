import { describe, expect, it } from "vitest";
import { actualDays, createDeposit, deriveDepositStatus, expectedInterestVnd, summarizeDeposits, transitionDeposit } from "../../../src/domain/deposit";

const deposit = (extra = {}) => createDeposit({ id: "d1", principalVnd: 1_000_000, annualRatePpm: 50_000, startDate: "2024-01-01", maturityDate: "2025-01-01", expectedInterestVndOverride: null, actualInterestVnd: null, ...extra });
describe("deposit domain", () => {
  it("calculates date days across leap years and rounded integer interest", () => {
    expect(actualDays("2024-01-01", "2025-01-01")).toBe(366);
    expect(expectedInterestVnd(deposit())).toBe(50_137);
  });
  it("supports override interest and derives the configured maturity window", () => {
    const d = deposit({ expectedInterestVndOverride: 12345 });
    expect(expectedInterestVnd(d)).toBe(12345);
    expect(deriveDepositStatus(d, "2023-12-31")).toBe("ACTIVE");
    expect(deriveDepositStatus(d, "2024-06-01")).toBe("ACTIVE");
    expect(deriveDepositStatus(d, "2024-12-01", 30)).toBe("ACTIVE");
    expect(deriveDepositStatus(d, "2024-12-02", 30)).toBe("MATURING");
    expect(deriveDepositStatus(d, "2025-01-01", 30)).toBe("MATURED");
    expect(deriveDepositStatus(d, "2025-01-02")).toBe("MATURED");
  });
  it("enforces status transitions and preserves input", () => {
    const d = deposit(); const next = transitionDeposit(d, "REDEEMED");
    expect(next.status).toBe("REDEEMED"); expect(d.status).toBe("ACTIVE");
    expect(() => transitionDeposit(next, "ACTIVE")).toThrowError(/transition/);
    expect(() => transitionDeposit(d, "MATURED" as never)).toThrowError(/transition/);
    expect(() => deposit({ status: "MATURED" })).toThrowError(/status/);
    expect(() => deposit({ status: "toString" })).toThrowError(/status/);
  });
  it("separates matured principal and excludes handled deposits from current totals", () => {
    const active = deposit({ expectedInterestVndOverride: 100 });
    const matured = deposit({ id: "d2", maturityDate: "2024-01-01", expectedInterestVndOverride: 200 });
    const redeemed = deposit({ id: "d3", status: "REDEEMED", expectedInterestVndOverride: 300, actualInterestVnd: 40_000 });
    const rolled = deposit({ id: "d4", status: "ROLLED_OVER", expectedInterestVndOverride: 400, actualInterestVnd: 50_000 });
    expect(summarizeDeposits([active, matured, redeemed, rolled], "2024-12-15")).toEqual({
      currentPrincipalVnd: 1_000_000,
      pendingMaturedPrincipalVnd: 1_000_000,
      expectedInterestVnd: 100,
      expectedMaturityTotalVnd: 1_000_100,
      actualInterestVnd: 90_000,
    });
  });
  it("keeps expected maturity interest stable after maturity", () => {
    const d = deposit();
    expect(expectedInterestVnd(d, "2025-01-01")).toBe(50_137);
    expect(expectedInterestVnd(d, "2026-01-01")).toBe(50_137);
    expect(summarizeDeposits([d], "2026-01-01").expectedMaturityTotalVnd).toBe(0);
    expect(summarizeDeposits([d], "2026-01-01").pendingMaturedPrincipalVnd).toBe(1_000_000);
  });
  it("rejects invalid ranges, rates and unsafe values", () => {
    expect(() => deposit({ maturityDate: "2023-12-31" })).toThrowError(/precede/);
    expect(() => deposit({ annualRatePpm: 1_000_001 })).toThrowError(/100%/);
    expect(() => deposit({ principalVnd: 1.5 })).toThrowError(/safe integer/);
  });
});
