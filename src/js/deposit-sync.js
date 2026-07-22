import { doc, onSnapshot } from "firebase/firestore";
import { createEmptyDepositDocument, serializeDepositBackup, validateDepositDocument } from "./deposit-schema.js";
import { state } from "./state.js";

const SAVINGS_LEDGER_ID = "shared_ledger_savings";

function assertProjectId(projectId) {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9_-]+$/.test(projectId)) throw new Error("Invalid Firebase project id");
}

export function applyDepositSnapshot(data) {
  const validated = validateDepositDocument(data ?? createEmptyDepositDocument());
  state.depositDocument = validated;
  return validated;
}

export function subscribeToDeposits(db, projectId, { onChange = () => {}, onError = () => {} } = {}) {
  assertProjectId(projectId);
  const reference = doc(db, "artifacts", projectId, "public", "data", "ledgers", SAVINGS_LEDGER_ID);
  return onSnapshot(reference, snapshot => {
    try {
      onChange(applyDepositSnapshot(snapshot.exists() ? snapshot.data() : null));
    } catch (error) {
      onError(error);
    }
  }, onError);
}

export function buildDepositBackup(document = state.depositDocument) {
  return {
    filename: `my-expense-deposits-v${document.schemaVersion}.json`,
    mimeType: "application/json",
    content: serializeDepositBackup(document),
  };
}
