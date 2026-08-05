import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-no-project";
const appId = "my-expense-app-test";
const ledgerPath = `artifacts/${appId}/public/data/ledgers/shared_ledger_2026`;
const nextLedgerPath = `artifacts/${appId}/public/data/ledgers/shared_ledger_2027`;
const memberPath = `artifacts/${appId}/public/data/members`;
const authorizedUids = ["girlfriend-fixture-uid", "owner-fixture-uid"];
let env;

function dbFor(uid) {
  return env.authenticatedContext(uid).firestore();
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("legacy ledger rules", () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      for (const uid of authorizedUids) {
        await setDoc(doc(context.firestore(), `${memberPath}/${uid}`), { access: "shared-ledger" });
      }
      await setDoc(doc(context.firestore(), ledgerPath), { balances: {}, entries: {}, settings: {} });
    });
  });

  afterAll(async () => env?.cleanup());

  it("allows the two provisioned members to read, create, and update ledger documents", async () => {
    for (const uid of authorizedUids) {
      const db = dbFor(uid);

      await assertSucceeds(getDoc(doc(db, ledgerPath)));
      await assertSucceeds(setDoc(doc(db, nextLedgerPath), { balances: {}, entries: {}, settings: {} }));
      await assertSucceeds(updateDoc(doc(db, ledgerPath), { entries: { [`1_1_${uid}`]: "10" } }));
    }
  });

  it("denies anonymous and unprovisioned ledger reads, creates, and updates", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), ledgerPath)));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), nextLedgerPath), { balances: {}, entries: {}, settings: {} }));

    for (const db of [
      dbFor("missing-member-uid"),
      dbFor("third-fixture-uid"),
    ]) {
      await assertFails(getDoc(doc(db, ledgerPath)));
      await assertFails(setDoc(doc(db, nextLedgerPath), { balances: {}, entries: {}, settings: {} }));
      await assertFails(updateDoc(doc(db, ledgerPath), { entries: { "1_1_food": "10" } }));
    }
  });

  it("denies ledger deletes even for the two provisioned members", async () => {
    for (const uid of authorizedUids) {
      await assertFails(deleteDoc(doc(dbFor(uid), ledgerPath)));
    }
  });

  it("denies access to non-ledger paths for provisioned members", async () => {
    const db = dbFor("girlfriend-fixture-uid");

    await assertFails(getDoc(doc(db, `artifacts/${appId}/public/data/members/girlfriend-fixture-uid`)));
    await assertFails(setDoc(doc(db, `artifacts/${appId}/public/data/members/girlfriend-fixture-uid`), { access: "shared-ledger" }));
  });
});
