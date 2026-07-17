import { describe, expect, it } from "vitest";
import { archiveAccount, assertAccountUsable, createAccount, updateAccount } from "../../../src/domain/account";
import { createMoney } from "../../../src/domain/money";

const now = "2026-07-17T12:00:00.000Z";

function activeAccount() {
  return createAccount({
    id: "cash-vnd",
    name: "现金",
    type: "cash",
    currency: "VND",
    openingBalance: createMoney(100_000, "VND"),
    openingDate: "2026-01-01",
  }, now);
}

describe("Account", () => {
  it("creates a versioned account with matching balance currency", () => {
    const account = activeAccount();
    expect(account.version).toBe(1);
    expect(account.openingBalance).toEqual({ amountMinor: 100_000, currency: "VND" });
    expect(account.archivedAt).toBeNull();
  });

  it("rejects invalid fields and currency mismatch", () => {
    expect(() => createAccount({ id: " ", name: "现金", type: "cash", currency: "VND", openingBalance: createMoney(0, "VND"), openingDate: "2026-01-01" }, now)).toThrowError(/id/i);
    expect(() => createAccount({ id: "cash", name: " ", type: "cash", currency: "VND", openingBalance: createMoney(0, "VND"), openingDate: "2026-01-01" }, now)).toThrowError(/name/i);
    expect(() => createAccount({ id: "cash", name: "现金", type: "cash", currency: "VND", openingBalance: createMoney(100, "CNY"), openingDate: "2026-01-01" }, now)).toThrowError(/currency/i);
    expect(() => createAccount({ id: "cash", name: "现金", type: "cash", currency: "VND", openingBalance: createMoney(0, "VND"), openingDate: "2026-02-30" }, now)).toThrowError(/date/i);
  });

  it("updates only with the expected version", () => {
    const account = activeAccount();
    expect(updateAccount(account, 1, { name: "钱包现金" }, "2026-07-18T00:00:00.000Z")).toMatchObject({ name: "钱包现金", version: 2 });
    expect(() => updateAccount(account, 2, { name: "冲突" }, now)).toThrowError(/version/i);
  });

  it("archives without deleting and rejects use in new transactions", () => {
    const archived = archiveAccount(activeAccount(), 1, now);
    expect(archived.archivedAt).toBe(now);
    expect(archived.version).toBe(2);
    expect(() => assertAccountUsable(archived)).toThrowError(/archived/i);
  });
});
