import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-no-project";
const appId = "my-expense-app-test";
const path = `artifacts/${appId}/public/data/ledgers/shared_ledger_savings`;
const memberPath = `artifacts/${appId}/public/data/members`;
const authorizedUids = ["fixture-0", "fixture-1"];
const ownerUid = "fixture-1";
let env;

function db(uid) { return env.authenticatedContext(uid).firestore(); }

async function seedAuthorizedMembers() {
  await env.withSecurityRulesDisabled(async (context) => {
    for (const uid of authorizedUids) {
      await setDoc(doc(context.firestore(), `${memberPath}/${uid}`), { access: "shared-ledger" });
    }
  });
}
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
  beforeEach(async () => { await env.clearFirestore(); await seedAuthorizedMembers(); });
  afterAll(async () => env?.cleanup());

  it("allows both provisioned members to create/read and denies anonymous or a third account", async () => {
    for (const uid of authorizedUids) {
      await env.clearFirestore();
      await seedAuthorizedMembers();
      await assertSucceeds(setDoc(doc(db(uid), path), createPayload(uid)));
      await assertSucceeds(getDoc(doc(db(uid), path)));
    }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
    await assertFails(setDoc(doc(db("third"), path), createPayload("third")));
  });

  it("denies delete, unknown fields, bad types/status, oversized maps, and forged audit", async () => {
    const owner = db(ownerUid);
    await assertFails(setDoc(doc(owner, path), { ...createPayload(ownerUid), surprise: true }));
    await assertFails(setDoc(doc(owner, path), createPayload(ownerUid, { principalVnd: "100" })));
    await assertFails(setDoc(doc(owner, path), createPayload(ownerUid, { status: "MATURED" })));
    await assertFails(setDoc(doc(owner, path), createPayload("someone-else")));
    const oversized = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`d-${i}`, deposit(ownerUid)]));
    await assertFails(setDoc(doc(owner, path), { ...createPayload(ownerUid), depositsById: oversized }));
    await assertSucceeds(setDoc(doc(owner, path), createPayload(ownerUid)));
    await assertFails(deleteDoc(doc(owner, path)));
  });

  it("allows one audited version increment and acknowledgement but denies stale/bulk mutation", async () => {
    const owner = db(ownerUid);
    await assertSucceeds(setDoc(doc(owner, path), createPayload(ownerUid)));
    const updated = deposit(ownerUid, { version: 2, note: "updated", createdAt: (await getDoc(doc(owner, path))).data().depositsById["deposit-1"].createdAt });
    await assertSucceeds(updateDoc(doc(owner, path), {
      depositsById: { "deposit-1": updated },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
    await assertFails(updateDoc(doc(owner, path), {
      depositsById: { "deposit-1": { ...updated, version: 2, updatedAt: serverTimestamp() } },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
    await assertSucceeds(updateDoc(doc(owner, path), {
      acknowledgementsByKey: { "deposit-1|2027-01-01|OVERDUE": { acknowledgedAt: serverTimestamp(), acknowledgedBy: ownerUid } },
      lastMutation: { kind: "ACKNOWLEDGE", targetId: "deposit-1|2027-01-01|OVERDUE", actorUid: ownerUid, at: serverTimestamp() },
    }));
    await assertFails(updateDoc(doc(owner, path), {
      acknowledgementsByKey: { "deposit-1|2027-01-01|UNKNOWN": { acknowledgedAt: serverTimestamp(), acknowledgedBy: ownerUid } },
      lastMutation: { kind: "ACKNOWLEDGE", targetId: "deposit-1|2027-01-01|UNKNOWN", actorUid: ownerUid, at: serverTimestamp() },
    }));
  });

  it("allows adding a second deposit to an existing fixed document", async () => {
    const owner = db(ownerUid);
    const reference = doc(owner, path);
    await assertSucceeds(setDoc(reference, createPayload(ownerUid)));
    const first = (await getDoc(reference)).data().depositsById["deposit-1"];
    await assertSucceeds(updateDoc(reference, {
      depositsById: {
        "deposit-1": first,
        "deposit-2": deposit(ownerUid, {
          institutionName: "Second Fixture Bank",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      },
      lastMutation: { kind: "CREATE_DEPOSIT", targetId: "deposit-2", actorUid: ownerUid, at: serverTimestamp() },
    }));
  });

  it("allows deleting only an active deposit", async () => {
    const owner = db(ownerUid);
    const reference = doc(owner, path);
    await assertSucceeds(setDoc(reference, createPayload(ownerUid)));
    await assertSucceeds(updateDoc(reference, {
      depositsById: {},
      lastMutation: { kind: "DELETE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));

    await env.clearFirestore();
    await seedAuthorizedMembers();
    await assertSucceeds(setDoc(reference, createPayload(ownerUid, {
      status: "REDEEMED",
      redeemedOn: "2027-01-02",
      actualInterestVnd: 550_000,
    })));
    await assertFails(updateDoc(reference, {
      depositsById: {},
      lastMutation: { kind: "DELETE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
  });

  it("denies impossible calendar dates and duplicate reminder offsets", async () => {
    const owner = db(ownerUid);
    await assertFails(setDoc(doc(owner, path), createPayload(ownerUid, { openedOn: "2026-02-29", maturesOn: "2026-03-01" })));
    await assertFails(setDoc(doc(owner, path), createPayload(ownerUid, { reminderDays: [30, 30] })));
  });

  it("preserves terminal status history and blocks updates after archive", async () => {
    const owner = db(ownerUid);
    const reference = doc(owner, path);
    await assertSucceeds(setDoc(reference, createPayload(ownerUid)));
    const created = (await getDoc(reference)).data().depositsById["deposit-1"];
    const redeemed = {
      ...created,
      status: "REDEEMED",
      redeemedOn: "2027-01-02",
      actualInterestVnd: 550_000,
      version: 2,
      updatedAt: serverTimestamp(),
      updatedBy: ownerUid,
    };
    await assertSucceeds(updateDoc(reference, {
      depositsById: { "deposit-1": redeemed },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));

    const terminal = (await getDoc(reference)).data().depositsById["deposit-1"];
    await assertFails(updateDoc(reference, {
      depositsById: { "deposit-1": { ...terminal, status: "ACTIVE", redeemedOn: null, actualInterestVnd: null, version: 3, updatedAt: serverTimestamp() } },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
    await assertFails(updateDoc(reference, {
      depositsById: { "deposit-1": { ...terminal, note: "forged terminal edit", version: 3, updatedAt: serverTimestamp() } },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));

    await assertSucceeds(updateDoc(reference, {
      depositsById: { "deposit-1": { ...terminal, version: 3, updatedAt: serverTimestamp(), updatedBy: ownerUid, archivedAt: serverTimestamp() } },
      lastMutation: { kind: "ARCHIVE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
    const archived = (await getDoc(reference)).data().depositsById["deposit-1"];
    await assertFails(updateDoc(reference, {
      depositsById: { "deposit-1": { ...archived, note: "forged archived edit", version: archived.version + 1, updatedAt: serverTimestamp() } },
      lastMutation: { kind: "UPDATE_DEPOSIT", targetId: "deposit-1", actorUid: ownerUid, at: serverTimestamp() },
    }));
  });
});
