export const LEDGER_TIMEZONE = "Asia/Ho_Chi_Minh";

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
