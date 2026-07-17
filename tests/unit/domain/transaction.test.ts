import { describe, expect, it } from "vitest";
import { createAccount } from "../../../src/domain/account";
import { createMoney } from "../../../src/domain/money";
import { createTransaction, restoreTransaction, softDeleteTransaction, updateTransaction } from "../../../src/domain/transaction";

const now = "2026-07-17T12:00:00.000Z";
const account = createAccount({ id: "cash", name: "现金", type: "cash", currency: "VND", openingBalance: createMoney(0, "VND"), openingDate: "2026-01-01" }, now);

function expense() {
  return createTransaction({
    id: "tx-1", operationId: "op-1", kind: "expense", amount: createMoney(50_000, "VND"),
    baseAmount: createMoney(50_000, "VND"), account, categoryId: "dining",
    occurredAt: "2026-07-17T11:00:00.000Z", localDate: "2026-07-17", note: "午餐",
    actorUid: "user-a", fx: null,
  }, now);
}

describe("Transaction", () => {
  it("creates an auditable income or expense", () => {
    expect(expense()).toMatchObject({ kind: "expense", version: 1, createdBy: "user-a", updatedBy: "user-a", deletedAt: null });
  });

  it("rejects zero/negative amounts, archived accounts and invalid local dates", () => {
    const input = { id: "tx", operationId: "op", kind: "income" as const, amount: createMoney(0, "VND"), baseAmount: createMoney(0, "VND"), account, categoryId: "salary", occurredAt: now, localDate: "2026-07-17", note: "", actorUid: "user-a", fx: null };
    expect(() => createTransaction(input, now)).toThrowError(/positive/i);
    expect(() => createTransaction({ ...input, amount: createMoney(1, "VND"), baseAmount: createMoney(1, "VND"), localDate: "2026-02-30" }, now)).toThrowError(/date/i);
    const archived = { ...account, archivedAt: now };
    expect(() => createTransaction({ ...input, amount: createMoney(1, "VND"), baseAmount: createMoney(1, "VND"), account: archived }, now)).toThrowError(/archived/i);
  });

  it("requires an FX snapshot when source and base currencies differ", () => {
    const cny = createAccount({ id: "cny", name: "人民币", type: "cash", currency: "CNY", openingBalance: createMoney(0, "CNY"), openingDate: "2026-01-01" }, now);
    const input = { id: "tx-cny", operationId: "op-cny", kind: "expense" as const, amount: createMoney(100, "CNY"), baseAmount: createMoney(3500, "VND"), account: cny, categoryId: "dining", occurredAt: now, localDate: "2026-07-17", note: "", actorUid: "user-a", fx: null };
    expect(() => createTransaction(input, now)).toThrowError(/fx/i);
    expect(createTransaction({ ...input, fx: { rateScaled: 3500, rateScale: 100, date: "2026-07-17", source: "manual" } }, now).fx).not.toBeNull();
  });

  it("uses optimistic versions and supports soft delete/restore", () => {
    const original = expense();
    expect(updateTransaction(original, 1, { note: "晚餐" }, "user-b", "2026-07-18T00:00:00.000Z")).toMatchObject({ note: "晚餐", version: 2, updatedBy: "user-b" });
    expect(() => updateTransaction(original, 2, { note: "冲突" }, "user-b", now)).toThrowError(/version/i);
    const deleted = softDeleteTransaction(original, 1, "user-b", now);
    expect(deleted.deletedAt).toBe(now);
    expect(restoreTransaction(deleted, 2, "user-a", "2026-07-18T00:00:00.000Z").deletedAt).toBeNull();
  });
});
