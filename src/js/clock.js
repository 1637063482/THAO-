export const LEDGER_TIMEZONE = "Asia/Ho_Chi_Minh";

/** @param {Date} date */
function ledgerParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LEDGER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getLedgerToday(date = new Date()) {
  const parts = ledgerParts(date);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dateKey: parts.year + "-" + parts.month + "-" + parts.day,
  };
}

/**
 * Return a stable Date anchor for the current calendar day in the ledger timezone.
 * Noon UTC avoids crossing the Vietnam local-date boundary when the value is
 * later normalized by streak calculations.
 * @param {Date} date
 * @returns {Date}
 */
export function getLedgerStreakDate(date = new Date()) {
  const today = getLedgerToday(date);
  return new Date(Date.UTC(today.year, today.month - 1, today.day, 12));
}

export function getNextLedgerMidnightDelay(date = new Date()) {
  const today = getLedgerToday(date);
  const nextMidnightUtc = Date.UTC(today.year, today.month - 1, today.day + 1, -7, 0, 0, 0);
  return Math.max(0, nextMidnightUtc - date.getTime());
}
