import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-no-project";
const ledgerPath = "artifacts/my-expense-app-test/public/data/ledgers/shared_ledger_2026";
let env;

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
      await setDoc(doc(context.firestore(), "artifacts/my-expense-app-test/public/data/members/authorized-a"), { access: "shared-ledger" });
      await setDoc(doc(context.firestore(), "artifacts/my-expense-app-test/public/data/members/authorized-b"), { access: "shared-ledger" });
      await setDoc(doc(context.firestore(), ledgerPath), { balances: {}, entries: {}, settings: {} });
    });
  });

  afterAll(async () => env?.cleanup());
  it("denies unauthenticated and non-member reads", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), ledgerPath)));
    await assertFails(getDoc(doc(env.authenticatedContext("outsider").firestore(), ledgerPath)));
  });

  it("allows both configured accounts to read and update the shared ledger", async () => {
    for (const uid of ["authorized-a", "authorized-b"]) {
      const db = env.authenticatedContext(uid).firestore();
      await assertSucceeds(getDoc(doc(db, ledgerPath)));
      await assertSucceeds(setDoc(doc(db, ledgerPath), { balances: {}, entries: { [`1_1_${uid}`]: "10" }, settings: {} }));
    }
  });

  it("denies unknown fields and deletes", async () => {
    const db = env.authenticatedContext("authorized-a").firestore();
    await assertFails(setDoc(doc(db, ledgerPath), { balances: {}, entries: {}, settings: {}, admin: true }));
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(db, ledgerPath)));
  });
});
