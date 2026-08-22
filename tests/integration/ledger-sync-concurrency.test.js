import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

const projectId = "demo-no-project";
const appId = "my-expense-app-sync-test";
const ledgerPath = `artifacts/${appId}/public/data/ledgers/shared_ledger_2026`;
const membersPath = `artifacts/${appId}/public/data/members`;
const memberUids = ["sync-member-a", "sync-member-b"];
let env;

function db(uid) {
  return env.authenticatedContext(uid).firestore();
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("ledger settings concurrency", () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
  });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      for (const uid of memberUids) {
        await setDoc(doc(context.firestore(), `${membersPath}/${uid}`), { access: "shared-ledger" });
      }
      await setDoc(doc(context.firestore(), ledgerPath), {
        balances: {}, entries: {}, settings: { budget_8: 1000 },
      });
    });
  });

  afterAll(async () => env?.cleanup());

  it("preserves different settings keys from concurrent member patches", async () => {
    await Promise.all([
      setDoc(doc(db(memberUids[0]), ledgerPath), { settings: { budget_8: 2000 } }, { merge: true }),
      setDoc(doc(db(memberUids[1]), ledgerPath), { settings: { savings_goal_month_8: 3000 } }, { merge: true }),
    ]);

    const snapshot = await getDoc(doc(db(memberUids[0]), ledgerPath));
    expect(snapshot.data()?.settings).toEqual({ budget_8: 2000, savings_goal_month_8: 3000 });
  });
});
