const TERMS = Object.freeze([
  Object.freeze({ code: "1M", months: 1 }),
  Object.freeze({ code: "3M", months: 3 }),
  Object.freeze({ code: "6M", months: 6 }),
  Object.freeze({ code: "9M", months: 9 }),
  Object.freeze({ code: "1Y", months: 12 }),
  Object.freeze({ code: "13M", months: 13 }),
  Object.freeze({ code: "15M", months: 15 }),
  Object.freeze({ code: "18M", months: 18 }),
  Object.freeze({ code: "2Y", months: 24 }),
  Object.freeze({ code: "3Y", months: 36 }),
]);
const LEGACY_TERMS = Object.freeze([
  Object.freeze({ code: "5Y", months: 60 }),
]);
const ALL_TERMS = Object.freeze([...TERMS, ...LEGACY_TERMS]);
/** @typedef {"1M" | "3M" | "6M" | "9M" | "1Y" | "13M" | "15M" | "18M" | "2Y" | "3Y" | "5Y"} DepositTermCode */

const LABELS = Object.freeze({
  vi: Object.freeze({
    "1M": "1 tháng", "3M": "3 tháng", "6M": "6 tháng", "9M": "9 tháng",
    "1Y": "12 tháng", "13M": "13 tháng", "15M": "15 tháng", "18M": "18 tháng",
    "2Y": "24 tháng", "3Y": "36 tháng", "5Y": "60 tháng",
  }),
  "zh-CN": Object.freeze({
    "1M": "1个月", "3M": "3个月", "6M": "6个月", "9M": "9个月",
    "1Y": "12个月", "13M": "13个月", "15M": "15个月", "18M": "18个月",
    "2Y": "24个月", "3Y": "36个月", "5Y": "60个月",
  }),
});

const LEGACY_LABELS = Object.freeze({
  vi: Object.freeze({
    "3M": "Tiền gửi 3 tháng", "6M": "Tiền gửi 6 tháng", "1Y": "Tiền gửi 1 năm",
    "2Y": "Tiền gửi 2 năm", "3Y": "Tiền gửi 3 năm", "5Y": "Tiền gửi 5 năm",
  }),
  "zh-CN": Object.freeze({
    "3M": "3个月定期", "6M": "6个月定期", "1Y": "1年定期",
    "2Y": "2年定期", "3Y": "3年定期", "5Y": "5年定期",
  }),
});

/** @param {import("../../types/app-state").AppLocale} locale @returns {Readonly<Record<DepositTermCode, string>>} */
function localeLabels(locale) {
  return LABELS[locale] || LABELS.vi;
}

/** @param {unknown} value @returns {DepositTermCode | null} */
export function normalizeDepositTermCode(value) {
  const normalized = String(value ?? "").trim();
  if (ALL_TERMS.some(term => term.code === normalized)) return /** @type {DepositTermCode} */ (normalized);
  for (const labels of [...Object.values(LABELS), ...Object.values(LEGACY_LABELS)]) {
    const match = Object.entries(labels).find(([, label]) => label === normalized);
    if (match) return /** @type {DepositTermCode} */ (match[0]);
  }
  return null;
}

/** @param {import("../../types/app-state").AppLocale} locale */
export function depositTermOptions(locale) {
  const labels = localeLabels(locale);
  return TERMS.map(term => ({ ...term, label: labels[term.code] }));
}

/** @param {unknown} value */
export function depositTermMonths(value) {
  const code = normalizeDepositTermCode(value);
  return ALL_TERMS.find(term => term.code === code)?.months ?? null;
}

/** @param {unknown} value @param {import("../../types/app-state").AppLocale} locale */
export function depositProductLabel(value, locale) {
  const code = normalizeDepositTermCode(value);
  return code ? localeLabels(locale)[code] : String(value ?? "");
}
