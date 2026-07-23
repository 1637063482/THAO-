import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/js/sync.js", () => ({ triggerCloudSave: vi.fn() }));
vi.mock("../../src/js/render.js", () => ({ updateStreakAfterRecord: vi.fn() }));

import { queueLegacyIncomeOnce } from "../../src/js/quick-add.js";

function fixture() {
  return { activeYear: 2026, appState: { entries: {} }, pendingUpdates: { entries: {} } };
}

describe("idempotent deposit-interest ledger bridge", () => {
  let stateRef; let onQueue; let onStreak;
  beforeEach(() => { stateRef = fixture(); onQueue = vi.fn(); onStreak = vi.fn(); });

  it("writes only the actual interest and a stable operation marker", async () => {
    await queueLegacyIncomeOnce({ amountVnd: 550_000, dateKey: "2026-08-01", operationId: "deposit-interest-fixture" }, { stateRef, onQueue, onStreak });
    expect(stateRef.appState.entries["8_1_income"]).toBe("=550000");
    expect(stateRef.appState.entries["8_1_remark"]).toContain("[#op:deposit-interest-fixture]");
    expect(JSON.stringify(stateRef)).not.toContain("10000000");
    expect(onQueue).toHaveBeenCalledOnce(); expect(onStreak).toHaveBeenCalledOnce();
  });

  it("does not apply the same operation twice", async () => {
    const input = { amountVnd: 550_000, dateKey: "2026-08-01", operationId: "deposit-interest-fixture" };
    await queueLegacyIncomeOnce(input, { stateRef, onQueue, onStreak });
    const result = await queueLegacyIncomeOnce(input, { stateRef, onQueue, onStreak });
    expect(result.applied).toBe(false); expect(stateRef.appState.entries["8_1_income"]).toBe("=550000");
    expect(onQueue).toHaveBeenCalledOnce(); expect(onStreak).toHaveBeenCalledOnce();
  });

  it("appends a different interest operation on the same day", async () => {
    await queueLegacyIncomeOnce({ amountVnd: 500, dateKey: "2026-08-01", operationId: "first" }, { stateRef, onQueue, onStreak });
    await queueLegacyIncomeOnce({ amountVnd: 700, dateKey: "2026-08-01", operationId: "second" }, { stateRef, onQueue, onStreak });
    expect(stateRef.appState.entries["8_1_income"]).toBe("=500+700");
  });

  it("rolls both entry mutations back when queueing fails", async () => {
    stateRef.appState.entries["8_1_income"] = "=100"; stateRef.pendingUpdates.entries["8_1_income"] = "=90";
    onQueue.mockRejectedValue(new Error("offline"));
    await expect(queueLegacyIncomeOnce({ amountVnd: 500, dateKey: "2026-08-01", operationId: "failure" }, { stateRef, onQueue, onStreak })).rejects.toThrow("offline");
    expect(stateRef.appState.entries).toEqual({ "8_1_income": "=100" });
    expect(stateRef.pendingUpdates.entries).toEqual({ "8_1_income": "=90" });
    expect(onStreak).not.toHaveBeenCalled();
  });

  it("rejects a date outside the loaded yearly ledger", async () => {
    await expect(queueLegacyIncomeOnce({ amountVnd: 500, dateKey: "2027-01-01", operationId: "wrong-year" }, { stateRef, onQueue, onStreak })).rejects.toThrow(/active ledger year/i);
  });
});
