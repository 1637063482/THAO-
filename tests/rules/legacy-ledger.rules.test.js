import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-no-project";
const appId = "my-expense-app-test";
const ledgerPath = `artifacts/${appId}/public/data/ledgers/shared_ledger_2026`;
const nextLedgerPath = `artifacts/${appId}/public/data/ledgers/shared_ledger_2027`;
const girlfriendEmail = "girlfriend.fixture@example.invalid";
const ownerEmail = "owner.fixture@example.invalid";
let env;

function dbFor(uid, email) {
  return env.authenticatedContext(uid, { email }).firestore();
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
      await setDoc(doc(context.firestore(), ledgerPath), { balances: {}, entries: {}, settings: {} });
    });
  });

  afterAll(async () => env?.cleanup());

  it("allows girlfriend and owner fixture emails to read, create, and update ledger documents", async () => {
    for (const [uid, email] of [
      ["girlfriend-fixture-uid", girlfriendEmail],
      ["owner-fixture-uid", ownerEmail.toUpperCase()],
    ]) {
      const db = dbFor(uid, email);

      await assertSucceeds(getDoc(doc(db, ledgerPath)));
      await assertSucceeds(setDoc(doc(db, nextLedgerPath), { balances: {}, entries: {}, settings: {} }));
      await assertSucceeds(updateDoc(doc(db, ledgerPath), { entries: { [`1_1_${uid}`]: "10" } }));
    }
  });

  it("denies anonymous, missing-email, and third-email ledger reads, creates, and updates", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), ledgerPath)));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), nextLedgerPath), { balances: {}, entries: {}, settings: {} }));

    for (const db of [
      env.authenticatedContext("missing-email").firestore(),
      dbFor("third-fixture-uid", "third.fixture@example.invalid"),
    ]) {
      await assertFails(getDoc(doc(db, ledgerPath)));
      await assertFails(setDoc(doc(db, nextLedgerPath), { balances: {}, entries: {}, settings: {} }));
      await assertFails(updateDoc(doc(db, ledgerPath), { entries: { "1_1_food": "10" } }));
    }
  });

  it("denies ledger deletes even for the two authorized fixture emails", async () => {
    for (const [uid, email] of [
      ["girlfriend-fixture-uid", girlfriendEmail],
      ["owner-fixture-uid", ownerEmail],
    ]) {
      await assertFails(deleteDoc(doc(dbFor(uid, email), ledgerPath)));
    }
  });

  it("denies access to non-ledger paths for authorized fixture emails", async () => {
    const db = dbFor("girlfriend-fixture-uid", girlfriendEmail);

    await assertFails(getDoc(doc(db, `artifacts/${appId}/public/data/members/girlfriend-fixture-uid`)));
    await assertFails(setDoc(doc(db, `artifacts/${appId}/public/data/members/girlfriend-fixture-uid`), { access: "shared-ledger" }));
  });
});
