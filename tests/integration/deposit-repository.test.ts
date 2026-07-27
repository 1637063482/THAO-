import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { DepositRepository } from "../../src/infrastructure/firebase/deposit-repository";

const firebaseProjectId = "demo-no-project";
const appProjectId = "my-expense-app-test";
const auth = { uid: "fixture-owner", email: "owner.fixture@example.invalid" };

function input() {
  return {
    id: "deposit-1",
    institutionName: "Fixture Bank",
    productName: "12 month deposit",
    principalVnd: 10_000_000,
    annualRatePpm: 55_000,
    openedOn: "2026-01-01",
    maturesOn: "2027-01-01",
    expectedInterestVnd: null,
    actualInterestVnd: null,
    reminderDays: [30, 7, 1],
    remindersEnabled: true,
    status: "ACTIVE" as const,
    redeemedOn: null,
    rolledOverToDepositId: null,
    note: "synthetic fixture",
  };
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("DepositRepository", () => {
  let env: RulesTestEnvironment;
  let repository: DepositRepository;

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: firebaseProjectId, firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  });
  beforeEach(async () => {
    await env.clearFirestore();
    repository = new DepositRepository(env.authenticatedContext(auth.uid, { email: auth.email }).firestore() as unknown as Firestore, appProjectId, auth.uid);
  });
  afterAll(async () => env?.cleanup());

  it("treats a missing fixed document as empty and round-trips CRUD/archive", async () => {
    expect(await repository.getDocument()).toMatchObject({ schemaVersion: 1, depositsById: {}, acknowledgementsByKey: {} });
    const created = await repository.create(input());
    expect(created).toMatchObject({ id: "deposit-1", version: 1, createdBy: auth.uid });
    const updated = await repository.update("deposit-1", 1, { note: "updated fixture" });
    expect(updated).toMatchObject({ note: "updated fixture", version: 2 });
    const archived = await repository.archive("deposit-1", 2);
    expect(archived.version).toBe(3);
    expect(archived.archivedAt).not.toBeNull();
  });

  it("persists acknowledgement and rejects stale concurrent versions", async () => {
    await repository.create(input());
    await repository.acknowledge("deposit-1|2027-01-01|OVERDUE");
    expect(Object.keys((await repository.getDocument()).acknowledgementsByKey)).toContain("deposit-1|2027-01-01|OVERDUE");
    await expect(repository.update("deposit-1", 2, { note: "stale" })).rejects.toThrow(/version/i);
  });

  it("retains acknowledgement audit keys after deletion without restoring the deleted ID", async () => {
    await repository.create(input());
    await repository.create({ ...input(), id: "deposit-2", institutionName: "Second Fixture Bank" });
    expect(Object.keys((await repository.getDocument()).depositsById)).toEqual(["deposit-1", "deposit-2"]);

    const acknowledgementKey = "deposit-2|2027-01-01|OVERDUE";
    await repository.acknowledge(acknowledgementKey);
    await repository.delete("deposit-2", 1);
    expect(await repository.get("deposit-2")).toBeNull();
    expect((await repository.getDocument()).acknowledgementsByKey).toHaveProperty(acknowledgementKey);
    await repository.create({ ...input(), id: "deposit-3", institutionName: "Replacement Fixture Bank" });
    expect(Object.keys((await repository.getDocument()).depositsById)).toEqual(["deposit-1", "deposit-3"]);

    const redeemed = await repository.update("deposit-1", 1, {
      status: "REDEEMED",
      redeemedOn: "2027-01-02",
      actualInterestVnd: 550_000,
    });
    await expect(repository.delete("deposit-1", redeemed.version)).rejects.toThrow(/active/i);
  });
});
