import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { createMoney } from "../../src/domain/money";
import { AccountRepository } from "../../src/infrastructure/firebase/account-repository";

const firebaseProjectId = "demo-no-project";
const appProjectId = "my-expense-app-test";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("AccountRepository", () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: firebaseProjectId, firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `artifacts/${appProjectId}/public/data/members/authorized-a`), { access: "shared-ledger" });
    });
  });
  afterAll(async () => env?.cleanup());

  it("round-trips and archives an account without field drift", async () => {
    const repository = new AccountRepository(env.authenticatedContext("authorized-a").firestore() as unknown as Firestore, appProjectId);
    const created = await repository.create({
      id: "cash-vnd", name: "现金", type: "cash", currency: "VND",
      openingBalance: createMoney(123_456, "VND"), openingDate: "2026-01-01",
    }, "2026-07-17T12:00:00.000Z");
    expect(await repository.get(created.id)).toEqual(created);
    const archived = await repository.archive(created.id, 1, "2026-07-18T00:00:00.000Z");
    expect(archived).toMatchObject({ id: "cash-vnd", version: 2, archivedAt: "2026-07-18T00:00:00.000Z" });
  });

  it("rejects stale version updates", async () => {
    const repository = new AccountRepository(env.authenticatedContext("authorized-a").firestore() as unknown as Firestore, appProjectId);
    await repository.create({ id: "bank", name: "银行卡", type: "bank", currency: "CNY", openingBalance: createMoney(0, "CNY"), openingDate: "2026-01-01" }, "2026-07-17T12:00:00.000Z");
    await expect(repository.update("bank", 2, { name: "冲突" }, "2026-07-18T00:00:00.000Z")).rejects.toThrow(/version/i);
  });

  it("does not overwrite an existing account during create", async () => {
    const repository = new AccountRepository(env.authenticatedContext("authorized-a").firestore() as unknown as Firestore, appProjectId);
    const input = { id: "wallet", name: "钱包", type: "ewallet" as const, currency: "VND" as const, openingBalance: createMoney(10, "VND"), openingDate: "2026-01-01" };
    await repository.create(input, "2026-07-17T12:00:00.000Z");
    await expect(repository.create({ ...input, name: "覆盖" }, "2026-07-18T00:00:00.000Z")).rejects.toThrow(/exists/i);
    expect((await repository.get("wallet"))?.name).toBe("钱包");
  });

  it("denies a third uid from reading the fixed ledger account path", async () => {
    const accountPath = `artifacts/${appProjectId}/public/data/ledgers/shared_ledger/accounts/cash-vnd`;
    await assertFails(getDoc(doc(env.authenticatedContext("outsider").firestore(), accountPath)));
  });
});
