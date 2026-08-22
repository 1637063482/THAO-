import { expenseCategories } from "./config.js";
import { isValidCalendarDate, parseVndAmount } from "./ledger-validation.js";

const MAX_FILE_BYTES = 900000;
const BALANCE_KEYS = new Set(["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"]);
const CATEGORY_IDS = new Set(expenseCategories.map((category) => category.id));
const DANGEROUS_TEXT_RE = /<\s*script|<\s*img|on\w+\s*=|javascript\s*:/i;
const OPERATION_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

function failure(code, path = "") {
  return { ok: false, code, path };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validAmount(value) {
  return parseVndAmount(value).ok;
}

export function validateLegacyImport(input, { serializedBytes, year } = {}) {
  const bytes = serializedBytes ?? new TextEncoder().encode(JSON.stringify(input)).length;
  if (bytes > MAX_FILE_BYTES) return failure("FILE_TOO_LARGE");
  if (!isRecord(input)) return failure("INVALID_ROOT");
  for (const key of Object.keys(input)) {
    if (!["balances", "entries", "settings", "operationsById"].includes(key)) return failure("UNKNOWN_TOP_LEVEL_FIELD", key);
  }
  if (!Object.prototype.hasOwnProperty.call(input, "entries")) return failure("MISSING_ENTRIES");
  for (const section of ["balances", "entries", "settings", "operationsById"]) {
    if (input[section] !== undefined && !isRecord(input[section])) return failure("INVALID_SECTION", section);
  }

  for (const [key, value] of Object.entries(input.balances || {})) {
    if (!BALANCE_KEYS.has(key)) return failure("INVALID_BALANCE_KEY", `balances.${key}`);
    if (!validAmount(value)) return failure("INVALID_AMOUNT", `balances.${key}`);
  }

  for (const [key, value] of Object.entries(input.entries)) {
    const match = /^(\d{1,2})_(\d{1,2})_([a-z]+)$/.exec(key);
    if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] < 1 || +match[2] > 31) return failure("INVALID_ENTRY_KEY", `entries.${key}`);
    const dateYear = Number.isSafeInteger(year) ? year : 2000;
    const dateKey = `${dateYear}-${String(+match[1]).padStart(2, "0")}-${String(+match[2]).padStart(2, "0")}`;
    if (!isValidCalendarDate(dateKey)) return failure("INVALID_ENTRY_DATE", `entries.${key}`);
    const field = match[3];
    if (field === "remark") {
      if (typeof value !== "string") return failure("INVALID_TEXT", `entries.${key}`);
      if (value.length > 1000) return failure("TEXT_TOO_LONG", `entries.${key}`);
      if (DANGEROUS_TEXT_RE.test(value)) return failure("DANGEROUS_TEXT", `entries.${key}`);
    } else if (field !== "income" && !CATEGORY_IDS.has(field)) {
      return failure("INVALID_ENTRY_KEY", `entries.${key}`);
    } else if (!validAmount(value)) return failure("INVALID_AMOUNT", `entries.${key}`);
  }

  for (const [key, value] of Object.entries(input.settings || {})) {
    const validKey = key === "monthlyBudget" || /^budget_(?:[1-9]|1[0-2])$/.test(key) || key === "expense_streak" || key === "expense_last_date" || /^savings_goal_month_(?:[1-9]|1[0-2])$/.test(key) || key === "savings_goal_annual";
    if (!validKey) return failure("INVALID_SETTING_KEY", `settings.${key}`);
    if (key === "expense_last_date") {
      if (!isValidCalendarDate(value)) return failure("INVALID_SETTING", `settings.${key}`);
    } else if (/^savings_goal_month_(?:[1-9]|1[0-2])$/.test(key) || key === "savings_goal_annual") {
      if (value !== null && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) return failure("INVALID_SETTING", `settings.${key}`);
    } else if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return failure("INVALID_SETTING", `settings.${key}`);
  }

  for (const [operationId, operation] of Object.entries(input.operationsById || {})) {
    if (!OPERATION_ID_RE.test(operationId) || !isRecord(operation)) return failure("INVALID_OPERATION", `operationsById.${operationId}`);
    if (operation.kind !== "DEPOSIT_INTEREST" || operation.status !== "COMPLETED") return failure("INVALID_OPERATION", `operationsById.${operationId}`);
    if (!isValidCalendarDate(operation.dateKey) || (Number.isSafeInteger(year) && Number(operation.dateKey.slice(0, 4)) !== year)) {
      return failure("INVALID_OPERATION", `operationsById.${operationId}.dateKey`);
    }
    if (typeof operation.amountVnd !== "number" || !Number.isSafeInteger(operation.amountVnd) || operation.amountVnd <= 0) {
      return failure("INVALID_OPERATION", `operationsById.${operationId}.amountVnd`);
    }
    if (Object.keys(operation).some(key => !["kind", "dateKey", "amountVnd", "status"].includes(key))) {
      return failure("INVALID_OPERATION", `operationsById.${operationId}`);
    }
  }
  return { ok: true, data: input };
}

export function serializeLegacyImport(data) {
  return JSON.stringify(data);
}

export const LEGACY_IMPORT_MAX_BYTES = MAX_FILE_BYTES;
