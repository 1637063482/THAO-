import { doc, getDoc, runTransaction, serverTimestamp, type DocumentData, type Firestore } from "firebase/firestore";
import { DomainError } from "../../domain/errors";
import { MAX_ACKNOWLEDGEMENTS, validateDepositDocument } from "../../js/deposit-schema.js";

const SAVINGS_LEDGER_ID = "shared_ledger_savings";
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ACK_RE = /^[A-Za-z0-9_-]{1,80}\|\d{4}-\d{2}-\d{2}\|(D30|D7|D1|D0|OVERDUE)$/;

export type PersistedDepositStatus = "ACTIVE" | "REDEEMED" | "ROLLED_OVER";
export interface DepositInput {
  id: string; institutionName: string; productName: string; principalVnd: number; annualRatePpm: number;
  openedOn: string; maturesOn: string; expectedInterestVnd: number | null; actualInterestVnd: number | null;
  reminderDays: number[]; remindersEnabled: boolean; status: PersistedDepositStatus; redeemedOn: string | null;
  rolledOverToDepositId: string | null; note: string;
}
export type DepositChanges = Partial<Omit<DepositInput, "id">>;
export interface StoredDeposit extends Omit<DepositInput, "id"> {
  id: string; version: number; createdAt: unknown; updatedAt: unknown; createdBy: string; updatedBy: string; archivedAt: unknown | null;
}
export interface DepositStorageDocument {
  schemaVersion: 1;
  depositsById: Record<string, Omit<StoredDeposit, "id">>;
  acknowledgementsByKey: Record<string, { acknowledgedAt: unknown; acknowledgedBy: string }>;
  lastMutation: null | { kind: "CREATE_DEPOSIT" | "UPDATE_DEPOSIT" | "ARCHIVE_DEPOSIT" | "DELETE_DEPOSIT" | "ACKNOWLEDGE"; targetId: string; actorUid: string; at: unknown };
}

function fail(code: string, message: string): never { throw new DomainError(code, message); }
function safeId(value: string, field = "deposit id") { if (!ID_RE.test(value)) fail("INVALID_DEPOSIT_ID", `${field} is invalid`); }
function safeAmount(value: number | null, field: string) {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) fail("INVALID_DEPOSIT_AMOUNT", `${field} is invalid`);
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number); const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}
function validateInput(input: DepositInput) {
  safeId(input.id); safeAmount(input.principalVnd, "principalVnd"); safeAmount(input.annualRatePpm, "annualRatePpm");
  safeAmount(input.expectedInterestVnd, "expectedInterestVnd"); safeAmount(input.actualInterestVnd, "actualInterestVnd");
  if (input.annualRatePpm > 1_000_000) fail("INVALID_RATE", "annualRatePpm exceeds 100%");
  if (!validDate(input.openedOn) || !validDate(input.maturesOn) || input.maturesOn <= input.openedOn) fail("INVALID_DATE_RANGE", "Deposit dates are invalid");
  if (!Array.isArray(input.reminderDays) || input.reminderDays.length > 10 || input.reminderDays.some(day => !Number.isSafeInteger(day) || day < 0 || day > 365) || new Set(input.reminderDays).size !== input.reminderDays.length) fail("INVALID_REMINDERS", "Reminder days are invalid");
  if (!["ACTIVE", "REDEEMED", "ROLLED_OVER"].includes(input.status)) fail("INVALID_DEPOSIT_STATUS", "Status is invalid");
  if (typeof input.remindersEnabled !== "boolean" || input.institutionName.length > 120 || input.productName.length > 120 || input.note.length > 1000) fail("INVALID_DEPOSIT_FIELD", "Deposit field is invalid");
  if (input.status === "ACTIVE" && (input.redeemedOn !== null || input.rolledOverToDepositId !== null)) fail("INVALID_DEPOSIT_STATUS", "Active deposit cannot have settlement data");
  if (input.status === "REDEEMED" && (!input.redeemedOn || input.rolledOverToDepositId !== null)) fail("INVALID_DEPOSIT_STATUS", "Redeemed deposit is inconsistent");
  if (input.status === "ROLLED_OVER" && !input.rolledOverToDepositId) fail("INVALID_DEPOSIT_STATUS", "Rolled-over deposit needs a target");
}
function emptyDocument(): DepositStorageDocument { return { schemaVersion: 1, depositsById: {}, acknowledgementsByKey: {}, lastMutation: null }; }
function decodeDocument(data: DocumentData): DepositStorageDocument {
  try {
    return validateDepositDocument(data) as DepositStorageDocument;
  } catch (error) {
    fail("INVALID_DEPOSIT_DOCUMENT", error instanceof Error ? error.message : "Malformed deposit document");
  }
}

export class DepositRepository {
  constructor(private readonly db: Firestore, private readonly projectId: string, private readonly actorUid: string) {
    if (!/^[A-Za-z0-9_-]+$/.test(projectId) || !actorUid || actorUid.length > 128) fail("INVALID_DEPOSIT_CONTEXT", "Repository context is invalid");
  }
  private ref() { return doc(this.db, "artifacts", this.projectId, "public", "data", "ledgers", SAVINGS_LEDGER_ID); }
  async getDocument(): Promise<DepositStorageDocument> {
    const snapshot = await getDoc(this.ref());
    return snapshot.exists() ? decodeDocument(snapshot.data()) : emptyDocument();
  }
  async get(id: string): Promise<StoredDeposit | null> {
    safeId(id); const record = (await this.getDocument()).depositsById[id]; return record ? { id, ...record } : null;
  }
  async create(input: DepositInput): Promise<StoredDeposit> {
    validateInput(input);
    return runTransaction(this.db, async transaction => {
      const reference = this.ref(); const snapshot = await transaction.get(reference);
      const current = snapshot.exists() ? decodeDocument(snapshot.data()) : emptyDocument();
      if (current.depositsById[input.id]) fail("DEPOSIT_ALREADY_EXISTS", "Deposit already exists");
      if (Object.keys(current.depositsById).length >= 100) fail("DEPOSIT_LIMIT", "Deposit limit reached");
      const stamp = serverTimestamp();
      const { id, ...fields } = input;
      const created = { ...fields, version: 1, createdAt: stamp, updatedAt: stamp, createdBy: this.actorUid, updatedBy: this.actorUid, archivedAt: null };
      transaction.set(reference, {
        ...current,
        depositsById: { ...current.depositsById, [id]: created },
        lastMutation: { kind: "CREATE_DEPOSIT", targetId: id, actorUid: this.actorUid, at: stamp },
      });
      return { id, ...created };
    });
  }
  async update(id: string, expectedVersion: number, changes: DepositChanges): Promise<StoredDeposit> {
    safeId(id);
    return runTransaction(this.db, async transaction => {
      const reference = this.ref(); const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      const current = decodeDocument(snapshot.data()); const existing = current.depositsById[id];
      if (!existing) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      if (existing.version !== expectedVersion) fail("DEPOSIT_VERSION_CONFLICT", "Deposit version conflict");
      const candidate = { id, ...existing, ...changes } as DepositInput & Omit<StoredDeposit, "id">; validateInput(candidate);
      const stamp = serverTimestamp();
      const updated = { ...existing, ...changes, version: existing.version + 1, updatedAt: stamp, updatedBy: this.actorUid };
      current.depositsById[id] = updated;
      current.lastMutation = { kind: "UPDATE_DEPOSIT", targetId: id, actorUid: this.actorUid, at: stamp };
      transaction.set(reference, current);
      return { id, ...updated };
    });
  }
  async archive(id: string, expectedVersion: number): Promise<StoredDeposit> {
    safeId(id);
    await runTransaction(this.db, async transaction => {
      const reference = this.ref(); const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      const current = decodeDocument(snapshot.data()); const existing = current.depositsById[id];
      if (!existing) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      if (existing.version !== expectedVersion) fail("DEPOSIT_VERSION_CONFLICT", "Deposit version conflict");
      const stamp = serverTimestamp();
      current.depositsById[id] = { ...existing, version: existing.version + 1, updatedAt: stamp, updatedBy: this.actorUid, archivedAt: stamp };
      current.lastMutation = { kind: "ARCHIVE_DEPOSIT", targetId: id, actorUid: this.actorUid, at: stamp };
      transaction.set(reference, current);
    });
    const archived = await this.get(id); if (!archived) fail("DEPOSIT_WRITE_FAILED", "Deposit was not persisted"); return archived;
  }
  async delete(id: string, expectedVersion: number): Promise<void> {
    safeId(id);
    await runTransaction(this.db, async transaction => {
      const reference = this.ref(); const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      const current = decodeDocument(snapshot.data()); const existing = current.depositsById[id];
      if (!existing) fail("DEPOSIT_NOT_FOUND", "Deposit not found");
      if (existing.version !== expectedVersion) fail("DEPOSIT_VERSION_CONFLICT", "Deposit version conflict");
      if (existing.status !== "ACTIVE") fail("INVALID_DEPOSIT_STATUS", "Only active deposits can be deleted");
      const stamp = serverTimestamp();
      const { [id]: _, ...remaining } = current.depositsById;
      current.depositsById = remaining;
      current.lastMutation = { kind: "DELETE_DEPOSIT", targetId: id, actorUid: this.actorUid, at: stamp };
      transaction.set(reference, current);
    });
  }
  async acknowledge(key: string): Promise<void> {
    if (!ACK_RE.test(key)) fail("INVALID_ACKNOWLEDGEMENT_KEY", "Acknowledgement key is invalid");
    await runTransaction(this.db, async transaction => {
      const reference = this.ref(); const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) fail("DEPOSIT_DOCUMENT_NOT_FOUND", "Cannot acknowledge before a deposit document exists");
      const current = decodeDocument(snapshot.data());
      if (Object.keys(current.acknowledgementsByKey).length >= MAX_ACKNOWLEDGEMENTS && !current.acknowledgementsByKey[key]) fail("ACKNOWLEDGEMENT_LIMIT", "Acknowledgement limit reached");
      const stamp = serverTimestamp();
      current.acknowledgementsByKey[key] = { acknowledgedAt: stamp, acknowledgedBy: this.actorUid };
      current.lastMutation = { kind: "ACKNOWLEDGE", targetId: key, actorUid: this.actorUid, at: stamp };
      transaction.set(reference, current);
    });
  }
}
