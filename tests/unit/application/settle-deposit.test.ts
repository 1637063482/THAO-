import { describe, expect, it, vi } from "vitest";
import { buildRolloverDepositId, redeemDeposit, rolloverDeposit, type RolloverInput, type SettlementDeposit } from "../../../src/application/deposits/settle-deposit";

function current(overrides: Partial<SettlementDeposit> = {}): SettlementDeposit {
  return { id: "old-deposit", version: 3, status: "ACTIVE", principalVnd: 10_000_000, maturesOn: "2026-07-31", actualInterestVnd: null, redeemedOn: null, rolledOverToDepositId: null, ...overrides };
}
function dependencies() {
  return { updateDeposit: vi.fn().mockResolvedValue({}), queueLegacyInterest: vi.fn().mockResolvedValue({ applied: true }) };
}

describe("deposit settlement use cases", () => {
  it("redeems first and queues only confirmed actual interest with a stable operation id", async () => {
    const deps = dependencies();
    const result = await redeemDeposit({ deposit: current(), settledOn: "2026-08-01", actualInterestVnd: 550_000, writeInterestToLedger: true }, deps);
    expect(deps.updateDeposit).toHaveBeenCalledWith("old-deposit", 3, { status: "REDEEMED", redeemedOn: "2026-08-01", actualInterestVnd: 550_000, rolledOverToDepositId: null });
    expect(deps.queueLegacyInterest).toHaveBeenCalledWith({ amountVnd: 550_000, dateKey: "2026-08-01", operationId: "deposit-interest-old-deposit-2026-07-31" });
    expect(JSON.stringify(deps.queueLegacyInterest.mock.calls)).not.toContain("10000000");
    expect(result.incomeQueued).toBe(true);
  });

  it("does not queue empty, zero or unconfirmed interest", async () => {
    for (const [actualInterestVnd, writeInterestToLedger] of [[null, true], [0, true], [500, false]] as const) {
      const deps = dependencies();
      await redeemDeposit({ deposit: current(), settledOn: "2026-08-01", actualInterestVnd, writeInterestToLedger }, deps);
      expect(deps.queueLegacyInterest).not.toHaveBeenCalled();
    }
  });

  it("resumes the income step without rewriting an identical redeemed deposit", async () => {
    const deps = dependencies();
    await redeemDeposit({ deposit: current({ status: "REDEEMED", actualInterestVnd: 550_000, redeemedOn: "2026-08-01" }), settledOn: "2026-08-01", actualInterestVnd: 550_000, writeInterestToLedger: true }, deps);
    expect(deps.updateDeposit).not.toHaveBeenCalled();
    expect(deps.queueLegacyInterest).toHaveBeenCalledOnce();
  });

  it("rejects conflicting terminal state instead of overwriting history", async () => {
    const deps = dependencies();
    await expect(redeemDeposit({ deposit: current({ status: "REDEEMED", actualInterestVnd: 1, redeemedOn: "2026-08-01" }), settledOn: "2026-08-01", actualInterestVnd: 2, writeInterestToLedger: false }, deps)).rejects.toThrow(/conflict/i);
    expect(deps.updateDeposit).not.toHaveBeenCalled();
  });

  it("creates a deterministic rollover target before linking the immutable old deposit", async () => {
    const deps = { ...dependencies(), getDeposit: vi.fn().mockResolvedValue(null), createDeposit: vi.fn().mockResolvedValue({}) };
    const next: RolloverInput = { id: "rollover-old-deposit-2026-07-31", institutionName: "Fixture Bank", productName: "Renewed", principalVnd: 10_000_000, annualRatePpm: 60_000, openedOn: "2026-08-01", maturesOn: "2027-08-01", expectedInterestVnd: null, actualInterestVnd: null, reminderDays: [30, 7, 1], remindersEnabled: true, status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: "" };
    await rolloverDeposit({ deposit: current(), rolloverDeposit: next, actualInterestVnd: 500_000, writeInterestToLedger: false }, deps);
    expect(deps.createDeposit).toHaveBeenCalledWith(next);
    expect(deps.updateDeposit).toHaveBeenCalledWith("old-deposit", 3, { status: "ROLLED_OVER", rolledOverToDepositId: next.id, redeemedOn: null, actualInterestVnd: 500_000 });
  });

  it("reuses a matching target after partial success and rejects a conflicting target", async () => {
    const target: RolloverInput = { id: "rollover-old-deposit-2026-07-31", principalVnd: 10_000_000, annualRatePpm: 60_000, openedOn: "2026-08-01", maturesOn: "2027-08-01", institutionName: "Fixture Bank", productName: "Renewed", expectedInterestVnd: null, actualInterestVnd: null, reminderDays: [30, 7, 1], remindersEnabled: true, status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null, note: "" };
    const deps = { ...dependencies(), getDeposit: vi.fn().mockResolvedValue(target), createDeposit: vi.fn() };
    await rolloverDeposit({ deposit: current(), rolloverDeposit: target, actualInterestVnd: null, writeInterestToLedger: false }, deps);
    expect(deps.createDeposit).not.toHaveBeenCalled();
    deps.getDeposit.mockResolvedValue({ ...target, principalVnd: 99 });
    await expect(rolloverDeposit({ deposit: current(), rolloverDeposit: target, actualInterestVnd: null, writeInterestToLedger: false }, deps)).rejects.toThrow(/conflict/i);
  });

  it("builds a deterministic valid rollover id for maximum-length imported ids", () => {
    const id = buildRolloverDepositId({ id: "a".repeat(80), maturesOn: "2026-07-31" });
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,80}$/); expect(id).toBe(buildRolloverDepositId({ id: "a".repeat(80), maturesOn: "2026-07-31" }));
  });
});
