import { describe, expect, it } from "vitest";
import { actualDays, createDeposit, deriveDepositStatus, expectedInterestVnd, summarizeDeposits, transitionDeposit } from "../../../src/domain/deposit";

const deposit = (extra = {}) => createDeposit({ id: "d1", principalVnd: 1_000_000, annualRatePpm: 50_000, startDate: "2024-01-01", maturityDate: "2025-01-01", expectedInterestVndOverride: null, actualInterestVnd: null, ...extra });
describe("deposit domain", () => {
  it("calculates date days across leap years and rounded integer interest", () => {
    expect(actualDays("2024-01-01", "2025-01-01")).toBe(366);
    expect(expectedInterestVnd(deposit())).toBe(50_000);
  });
  it("supports override interest and derived MATURING status", () => {
    const d = deposit({ expectedInterestVndOverride: 12345 });
    expect(expectedInterestVnd(d)).toBe(12345);
    expect(deriveDepositStatus(d, "2024-06-01")).toBe("MATURING");
    expect(deriveDepositStatus(d, "2025-01-01")).toBe("MATURED");
  });
  it("enforces status transitions and preserves input", () => {
    const d = deposit(); const next = transitionDeposit(d, "MATURED");
    expect(next.status).toBe("MATURED"); expect(d.status).toBe("ACTIVE");
    expect(() => transitionDeposit(next, "ACTIVE")).toThrowError(/transition/);
  });
  it("summarizes principal, expected and actual interest without redeemed principal", () => {
    const redeemed = deposit({ id: "d2", status: "REDEEMED", actualInterestVnd: 40000 });
    expect(summarizeDeposits([deposit(), redeemed], "2024-07-01")).toEqual({ currentPrincipalVnd: 1_000_000, expectedInterestVnd: 49_726, expectedMaturityTotalVnd: 1_049_726, actualInterestVnd: 40_000 });
  });
  it("rejects invalid ranges, rates and unsafe values", () => {
    expect(() => deposit({ maturityDate: "2023-12-31" })).toThrowError(/precede/);
    expect(() => deposit({ annualRatePpm: 1_000_001 })).toThrowError(/100%/);
    expect(() => deposit({ principalVnd: 1.5 })).toThrowError(/safe integer/);
  });
});
