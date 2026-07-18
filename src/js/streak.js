import { safeEval } from "./utils.js";
import { expenseCategories } from "./config.js";

const FORMULA_RE = /^[\d\s+\-*/().eE]+$/;
const ENTRY_KEY_RE = /^(\d{1,2})_(\d{1,2})_([A-Za-z0-9_-]+)$/;
const EXPENSE_CATEGORY_IDS = new Set(expenseCategories.map((category) => category.id));

function localDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateString(date, timezone) {
  const parts = localDateParts(date, timezone);
  return parts.year + "-" + parts.month + "-" + parts.day;
}

function previousLocalDate(dateStr, timezone) {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  return localDateString(new Date(Date.UTC(year, month - 1, day - 1, 12)), timezone);
}

function isRealDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isCalculableNonZero(value) {
  if (value === undefined || value === null) return false;
  const raw = String(value).trim();
  if (!raw || raw === "0") return false;
  const expr = raw.startsWith("=") ? raw.slice(1).trim() : raw;
  if (!expr || !FORMULA_RE.test(expr) || /[+\-*/]{2,}/.test(expr) || /[+\-*/]$/.test(expr)) return false;
  return safeEval(raw) !== 0;
}

function entryDateFromKey(key, year) {
  const match = ENTRY_KEY_RE.exec(key);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const field = match[3];
  if (field !== "income" && !EXPENSE_CATEGORY_IDS.has(field)) return null;
  if (!isRealDate(year, month, day)) return null;
  return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

export function buildLegacyStreak(entries, year, today = new Date(), timezone = "Asia/Ho_Chi_Minh") {
  const todayStr = localDateString(today, timezone);
  const recordedDates = new Set();

  Object.entries(entries || {}).forEach(([key, value]) => {
    if (!isCalculableNonZero(value)) return;
    const dateStr = entryDateFromKey(key, year);
    if (dateStr) recordedDates.add(dateStr);
  });

  let streak = 0;
  let cursor = todayStr;
  while (recordedDates.has(cursor)) {
    streak += 1;
    cursor = previousLocalDate(cursor, timezone);
  }

  return {
    streak,
    hasRecordedToday: recordedDates.has(todayStr),
    todayStr,
    recordedDates,
  };
}
