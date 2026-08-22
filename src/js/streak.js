import { interpretLedger } from "../domain/ledger-interpreter.js";

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

function collectActivityDates(activityDates, entries, year) {
  interpretLedger({ year, entries }).activityDates.forEach((date) => activityDates.add(date));
}

export function buildLegacyStreak(entries, year, today = new Date(), timezone = "Asia/Ho_Chi_Minh", options = {}) {
  const todayStr = localDateString(today, timezone);
  const activityDates = new Set();

  collectActivityDates(activityDates, entries, year);
  collectActivityDates(activityDates, options.previousYearEntries, year - 1);

  let streak = 0;
  let cursor = todayStr;
  while (activityDates.has(cursor)) {
    streak += 1;
    cursor = previousLocalDate(cursor, timezone);
  }

  return {
    streak,
    hasRecordedToday: activityDates.has(todayStr),
    todayStr,
    recordedDates: activityDates,
  };
}
