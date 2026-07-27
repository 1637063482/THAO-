import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-no-project";
const appId = "my-expense-app-test";
const path = `artifacts/${appId}/public/data/ledgers/shared_ledger_savings`;
const emails = ["girlfriend.fixture@example.invalid", "owner.fixture@example.invalid"];
let env;

function db(uid, email) { return env.authenticatedContext(uid, { email }).firestore(); }
function deposit(uid, overrides = {}) {
  return {
    institutionName: "Fixture Bank", productName: "12 month deposit", principalVnd: 10_000_000,
    annualRatePpm: 55_000, openedOn: "2026-01-01", maturesOn: "2027-01-01",
    expectedInterestVnd: null, actualInterestVnd: null, reminderDays: [30, 7, 1],
    remindersEnabled: true, status: "ACTIVE", redeemedOn: null, rolledOverToDepositId: null,
    note: "synthetic fixture", version: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    createdBy: uid, updatedBy: uid, archivedAt: null, ...overrides,
  };
}
function createPayload(uid, overrides = {}) {
  return {
    schemaVersion: 1,
    depositsById: { "deposit-1": deposit(uid, overrides) },
    acknowledgementsByKey: {},
    lastMutation: { kind: "CREATE_DEPOSIT", targetId: "deposit-1", actorUid: uid, at: serverTimestamp() },
  };
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("deposit fixed-document rules", () => {
  beforeAll(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
  beforeEach(async () => env.clearFirestore());
  afterAll(async () => env?.cleanup());

  it("allows both fixture accounts to create/read and denies anonymous or a third account", async () => {
    for (let i = 0; i < emails.length; i += 1) {
      await env.clearFirestore();
      const uid = `fixture-${i}`;
      await assertSucceeds(setDoc(doc(db(uid, emails[i]), path), createPayload(uid)));
      await assertSucceeds(getDoc(doc(db(uid, emails[i]), path)));
    }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
    await assertFails(setDoc(doc(db("third", "third.fixture@example.invalid"), path), createPayload("third")));
  });

  it("denies delete, unknown fields, bad types/status, oversized maps, and forged audit", async () => {
    const owner = db("owner", emails[1]);
    await assertFails(setDoc(doc(owner, path), { ...createPayload("owner"), surprise: true }));
    await assertFails(setDoc(doc(owner, path), createPayload("owner", { principalVnd: "100" })));
    await assertFails(setDoc(doc(owner, path), createPayload("owner", { status: "MATURED" })));
    await assertFails(setDoc(doc(owner, path), createPayload("someone-else")));
    const oversized = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`d-${i}`, deposit("owner")]));
    await assertFails(setDoc(doc(owner, path), { ...createPayload("owner"), depositsById: oversized }));
    await assertSucceeds(setDoc(doc(owner, path), createPayload("owner")));
    await assertFails(deleteDoc(doc(owner, path)));
  });

  it("allows one audited version increment and acknowledgement but denies stale/bulk mutation", async () => {
    const owner = db("owner", emails[1]);
    await assertSucceeds(setDoc(doc(owner, path), createPayload("owner")));
    const updated = deposit("owner", { version: 2, note: "updated", createdAt: (await getDoc(doc(owner, path))).data().depositsById["deposit-1"].createdAt });
    await assertSucceeds(updateDoc(doc(owner, path), {
      depositsById: { "deposit-1": updated },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: "owner", at: serverTimestamp() },
    }));
    await assertFails(updateDoc(doc(owner, path), {
      depositsById: { "deposit-1": { ...updated, version: 2, updatedAt: serverTimestamp() } },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: "owner", at: serverTimestamp() },
    }));
    await assertSucceeds(updateDoc(doc(owner, path), {
      acknowledgementsByKey: { "deposit-1|2027-01-01|OVERDUE": { acknowledgedAt: serverTimestamp(), acknowledgedBy: "owner" } },
      lastMutation: { kind: "ACKNOWLEDGE", targetId: "deposit-1|2027-01-01|OVERDUE", actorUid: "owner", at: serverTimestamp() },
    }));
    await assertFails(updateDoc(doc(owner, path), {
      acknowledgementsByKey: { "deposit-1|2027-01-01|UNKNOWN": { acknowledgedAt: serverTimestamp(), acknowledgedBy: "owner" } },
      lastMutation: { kind: "ACKNOWLEDGE", targetId: "deposit-1|2027-01-01|UNKNOWN", actorUid: "owner", at: serverTimestamp() },
    }));
  });

  it("allows adding a second deposit to an existing fixed document", async () => {
    const owner = db("owner", emails[1]);
    const reference = doc(owner, path);
    await assertSucceeds(setDoc(reference, createPayload("owner")));
    const first = (await getDoc(reference)).data().depositsById["deposit-1"];
    await assertSucceeds(updateDoc(reference, {
      depositsById: {
        "deposit-1": first,
        "deposit-2": deposit("owner", {
          institutionName: "Second Fixture Bank",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      },
      lastMutation: { kind: "CREATE_DEPOSIT", targetId: "deposit-2", actorUid: "owner", at: serverTimestamp() },
    }));
  });

  it("allows deleting only an active deposit", async () => {
    const owner = db("owner", emails[1]);
    const reference = doc(owner, path);
    await assertSucceeds(setDoc(reference, createPayload("owner")));
    await assertSucceeds(updateDoc(reference, {
      depositsById: {},
      lastMutation: { kind: "DELETE_DEPOSIT", targetId: "deposit-1", actorUid: "owner", at: serverTimestamp() },
    }));

    await env.clearFirestore();
    await assertSucceeds(setDoc(reference, createPayload("owner", {
      status: "REDEEMED",
      redeemedOn: "2027-01-02",
      actualInterestVnd: 550_000,
    })));
    await assertFails(updateDoc(reference, {
      depositsById: {},
      lastMutation: { kind: "DELETE_DEPOSIT", targetId: "deposit-1", actorUid: "owner", at: serverTimestamp() },
    }));
  });
});
