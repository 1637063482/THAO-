import { expenseCategories } from "./config.js";

const MAX_FILE_BYTES = 900000;
const BALANCE_KEYS = new Set(["bal-bank", "bal-alipay", "bal-wechat", "bal-other", "end-bal-bank", "end-bal-alipay", "end-bal-wechat", "end-bal-other"]);
const CATEGORY_IDS = new Set(expenseCategories.map((category) => category.id));
const AMOUNT_RE = /^=?[\d\s+\-*/().eE]+$/;
const DANGEROUS_TEXT_RE = /<\s*script|<\s*img|on\w+\s*=|javascript\s*:/i;

function failure(code, path = "") {
  return { ok: false, code, path };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validAmount(value) {
  return (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.length <= 200 && AMOUNT_RE.test(value));
}

export function validateLegacyImport(input, { serializedBytes } = {}) {
  const bytes = serializedBytes ?? new TextEncoder().encode(JSON.stringify(input)).length;
  if (bytes > MAX_FILE_BYTES) return failure("FILE_TOO_LARGE");
  if (!isRecord(input)) return failure("INVALID_ROOT");
  for (const key of Object.keys(input)) {
    if (!["balances", "entries", "settings"].includes(key)) return failure("UNKNOWN_TOP_LEVEL_FIELD", key);
  }
  if (!Object.prototype.hasOwnProperty.call(input, "entries")) return failure("MISSING_ENTRIES");
  for (const section of ["balances", "entries", "settings"]) {
    if (input[section] !== undefined && !isRecord(input[section])) return failure("INVALID_SECTION", section);
  }

  for (const [key, value] of Object.entries(input.balances || {})) {
    if (!BALANCE_KEYS.has(key)) return failure("INVALID_BALANCE_KEY", `balances.${key}`);
    if (!validAmount(value)) return failure("INVALID_AMOUNT", `balances.${key}`);
  }

  for (const [key, value] of Object.entries(input.entries)) {
    const match = /^(\d{1,2})_(\d{1,2})_([a-z]+)$/.exec(key);
    if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] < 1 || +match[2] > 31) return failure("INVALID_ENTRY_KEY", `entries.${key}`);
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
    const validKey = key === "monthlyBudget" || /^budget_(?:[1-9]|1[0-2])$/.test(key) || key === "expense_streak" || key === "expense_last_date";
    if (!validKey) return failure("INVALID_SETTING_KEY", `settings.${key}`);
    if (key === "expense_last_date") {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return failure("INVALID_SETTING", `settings.${key}`);
    } else if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return failure("INVALID_SETTING", `settings.${key}`);
  }
  return { ok: true, data: input };
}

export function serializeLegacyImport(data) {
  return JSON.stringify(data);
}

export const LEGACY_IMPORT_MAX_BYTES = MAX_FILE_BYTES;
