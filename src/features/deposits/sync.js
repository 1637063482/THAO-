import { doc, onSnapshot } from "firebase/firestore";
import { createEmptyDepositDocument, serializeDepositBackup, validateDepositDocument } from "../../js/deposit-schema.js";
import { state } from "../../js/state.js";

const SAVINGS_LEDGER_ID = "shared_ledger_savings";

/** @param {string} projectId */
function assertProjectId(projectId) {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9_-]+$/.test(projectId)) throw new Error("Invalid Firebase project id");
}

/** @param {unknown} data @returns {import("../../types/app-state").DepositStorageDocument} */
export function applyDepositSnapshot(data) {
  const validated = /** @type {import("../../types/app-state").DepositStorageDocument} */ (
    validateDepositDocument(data ?? createEmptyDepositDocument())
  );
  state.depositDocument = validated;
  return validated;
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} projectId
 * @param {import("../../types/app-state").DepositSnapshotCallbacks} [callbacks]
 */
export function subscribeToDeposits(db, projectId, { onChange = () => {}, onError = () => {} } = {}) {
  assertProjectId(projectId);
  const reference = doc(db, "artifacts", projectId, "public", "data", "ledgers", SAVINGS_LEDGER_ID);
  return onSnapshot(reference, snapshot => {
    try {
      onChange(applyDepositSnapshot(snapshot.exists() ? snapshot.data() : null), { fromCache: Boolean(snapshot.metadata?.fromCache) });
    } catch (error) {
      onError(error);
    }
  }, onError);
}

/** @param {import("../../types/app-state").DepositStorageDocument} [document] */
export function buildDepositBackup(document = state.depositDocument) {
  return {
    filename: `my-expense-deposits-v${document.schemaVersion}.json`,
    mimeType: "application/json",
    content: serializeDepositBackup(document),
  };
}
