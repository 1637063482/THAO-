export const DEPOSIT_SCHEMA_VERSION = 1;
export const DEPOSIT_BACKUP_VERSION = 1;
export const MAX_DEPOSITS = 100;
export const MAX_ACKNOWLEDGEMENTS = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ACK_KEY_RE = /^[A-Za-z0-9_-]{1,80}\|\d{4}-\d{2}-\d{2}\|(D30|D7|D1|D0|OVERDUE)$/;
const STATUSES = new Set(["ACTIVE", "REDEEMED", "ROLLED_OVER"]);
const MUTATIONS = new Set(["CREATE_DEPOSIT", "UPDATE_DEPOSIT", "ARCHIVE_DEPOSIT", "ACKNOWLEDGE"]);
const ROOT_FIELDS = ["schemaVersion", "depositsById", "acknowledgementsByKey", "lastMutation"];
const DEPOSIT_FIELDS = [
  "institutionName", "productName", "principalVnd", "annualRatePpm", "openedOn", "maturesOn",
  "expectedInterestVnd", "actualInterestVnd", "reminderDays", "remindersEnabled", "status",
  "redeemedOn", "rolledOverToDepositId", "note", "version", "createdAt", "updatedAt",
  "createdBy", "updatedBy", "archivedAt",
];

function fail(message) { throw new Error(`Invalid deposit document: ${message}`); }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactFields(value, fields, label) {
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) fail(`${label} has an unknown or missing field`);
}
function safeVnd(value, field, nullable = false) {
  if (nullable && value === null) return;
  if (!Number.isSafeInteger(value) || value < 0) fail(`${field} must be a non-negative safe integer`);
}
function validDate(value, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !DATE_RE.test(value)) fail("date must use YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) fail("date is not a calendar date");
}
function validTimestamp(value, nullable = false) {
  if (nullable && value === null) return;
  if (!(value instanceof Date) && !(isObject(value) && typeof value.toDate === "function")) fail("audit field must be a timestamp");
}
function text(value, field, max, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length > max) fail(`${field} must be a bounded string`);
}

function validateRecord(id, record) {
  if (!ID_RE.test(id) || !isObject(record)) fail("deposit id or record is invalid");
  exactFields(record, DEPOSIT_FIELDS, "deposit");
  text(record.institutionName, "institutionName", 120);
  text(record.productName, "productName", 120);
  safeVnd(record.principalVnd, "principalVnd");
  safeVnd(record.annualRatePpm, "annualRatePpm");
  if (record.annualRatePpm > 1_000_000) fail("annualRatePpm must not exceed 100%");
  validDate(record.openedOn);
  validDate(record.maturesOn);
  if (record.maturesOn <= record.openedOn) fail("maturity date must be later than opened date");
  safeVnd(record.expectedInterestVnd, "expectedInterestVnd", true);
  safeVnd(record.actualInterestVnd, "actualInterestVnd", true);
  if (!Array.isArray(record.reminderDays) || record.reminderDays.length > 10 ||
      record.reminderDays.some(day => !Number.isSafeInteger(day) || day < 0 || day > 365) ||
      new Set(record.reminderDays).size !== record.reminderDays.length) fail("reminderDays must contain unique day integers");
  if (typeof record.remindersEnabled !== "boolean") fail("remindersEnabled must be boolean");
  if (!STATUSES.has(record.status)) fail("status is not persistable");
  validDate(record.redeemedOn, true);
  text(record.rolledOverToDepositId, "rolledOverToDepositId", 80, true);
  if (record.rolledOverToDepositId !== null && !ID_RE.test(record.rolledOverToDepositId)) fail("rolledOverToDepositId is invalid");
  if (record.status === "ACTIVE" && (record.redeemedOn !== null || record.rolledOverToDepositId !== null)) fail("active deposit cannot be handled");
  if (record.status === "REDEEMED" && (record.redeemedOn === null || record.rolledOverToDepositId !== null)) fail("redeemed deposit fields conflict");
  if (record.status === "ROLLED_OVER" && record.rolledOverToDepositId === null) fail("rolled-over deposit requires a target");
  text(record.note, "note", 1000);
  if (!Number.isSafeInteger(record.version) || record.version < 1) fail("version must be positive");
  validTimestamp(record.createdAt);
  validTimestamp(record.updatedAt);
  text(record.createdBy, "createdBy", 128);
  text(record.updatedBy, "updatedBy", 128);
  if (!record.createdBy || !record.updatedBy) fail("audit uid cannot be empty");
  validTimestamp(record.archivedAt, true);
}

function validateAcknowledgement(key, acknowledgement) {
  if (!ACK_KEY_RE.test(key) || !isObject(acknowledgement)) fail("acknowledgement key or value is invalid");
  exactFields(acknowledgement, ["acknowledgedAt", "acknowledgedBy"], "acknowledgement");
  validTimestamp(acknowledgement.acknowledgedAt);
  text(acknowledgement.acknowledgedBy, "acknowledgedBy", 128);
  if (!acknowledgement.acknowledgedBy) fail("acknowledgedBy cannot be empty");
}

function validateMutation(mutation) {
  if (mutation === null) return;
  if (!isObject(mutation)) fail("lastMutation must be an object");
  exactFields(mutation, ["kind", "targetId", "actorUid", "at"], "lastMutation");
  if (!MUTATIONS.has(mutation.kind)) fail("mutation kind is invalid");
  text(mutation.targetId, "targetId", 120);
  text(mutation.actorUid, "actorUid", 128);
  if (!mutation.targetId || !mutation.actorUid) fail("mutation identity cannot be empty");
  validTimestamp(mutation.at);
}

export function createEmptyDepositDocument() {
  return { schemaVersion: DEPOSIT_SCHEMA_VERSION, depositsById: {}, acknowledgementsByKey: {}, lastMutation: null };
}

export function validateDepositDocument(value) {
  if (!isObject(value)) fail("root must be an object");
  exactFields(value, ROOT_FIELDS, "root");
  if (value.schemaVersion !== DEPOSIT_SCHEMA_VERSION) fail("schemaVersion is unsupported");
  if (!isObject(value.depositsById) || Object.keys(value.depositsById).length > MAX_DEPOSITS) fail("depositsById must contain at most 100 records");
  if (!isObject(value.acknowledgementsByKey) || Object.keys(value.acknowledgementsByKey).length > MAX_ACKNOWLEDGEMENTS) fail("acknowledgementsByKey must contain at most 500 records");
  Object.entries(value.depositsById).forEach(([id, record]) => validateRecord(id, record));
  Object.entries(value.acknowledgementsByKey).forEach(([key, acknowledgement]) => validateAcknowledgement(key, acknowledgement));
  validateMutation(value.lastMutation);
  return value;
}

export function serializeDepositBackup(value) {
  validateDepositDocument(value);
  return JSON.stringify({
    backupVersion: DEPOSIT_BACKUP_VERSION,
    schemaVersion: value.schemaVersion,
    depositsById: value.depositsById,
    acknowledgementsByKey: value.acknowledgementsByKey,
  }, null, 2);
}
