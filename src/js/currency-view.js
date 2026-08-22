import { formatVndInputValue } from "./vnd-input.js";
import { parseCurrencyAmountToVnd } from "./ledger-validation.js";

/** @param {unknown} rate @returns {rate is number} */
export function isValidCurrencyRate(rate) {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

/** @param {unknown} rawValue */
export function normalizeCurrencyInput(rawValue) {
  return String(rawValue ?? "").replace(/,/g, "").trim();
}

/** @param {unknown} rawValue @param {"VND" | "CNY"} currency */
export function formatCurrencyInput(rawValue, currency) {
  const input = String(rawValue ?? "");
  if (input === "") return "";
  if (currency === "VND") {
    const normalizedVnd = input.replace(/[^\d.]/g, "");
    const decimalIndex = normalizedVnd.indexOf(".");
    if (decimalIndex === -1) return formatVndInputValue(normalizedVnd);
    return formatVndInputValue(normalizedVnd.slice(0, decimalIndex) || "0") + "." + normalizedVnd.slice(decimalIndex + 1);
  }

  const normalized = input.replace(/[^\d.]/g, "");
  const decimalIndex = normalized.indexOf(".");
  const integerPart = decimalIndex === -1 ? normalized : normalized.slice(0, decimalIndex);
  const fractionPart = decimalIndex === -1 ? "" : normalized.slice(decimalIndex + 1);
  const groupedInteger = formatVndInputValue(integerPart || "0");
  return decimalIndex === -1 ? groupedInteger : groupedInteger + "." + fractionPart;
}

/** @param {unknown} vndVal @param {"VND" | "CNY"} currency @param {unknown} rate */
export function formatVndForCurrencyDisplay(vndVal, currency, rate) {
  const val = parseFloat(String(vndVal ?? "")) || 0;
  if (currency === "VND") return Math.round(val).toLocaleString("en-US");
  if (!isValidCurrencyRate(rate)) return "汇率不可用";
  return (val / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** @param {unknown} rawVnd @param {"VND" | "CNY"} currency @param {unknown} rate */
export function formatVndForCurrencyInput(rawVnd, currency, rate) {
  if (rawVnd === undefined || rawVnd === null || rawVnd === "") return "";
  if (currency === "VND") return String(rawVnd);
  if (!isValidCurrencyRate(rate)) return "";
  const vndVal = parseFloat(String(rawVnd)) || 0;
  return vndVal ? String(parseFloat((vndVal / rate).toFixed(2))) : "";
}

/** @param {unknown} rawInput @param {{currency: "VND" | "CNY", rate: unknown, previousRawVnd?: string, previousViewValue?: string, evaluate: (value: string) => number}} options */
export function parseCurrencyInputToVnd(rawInput, options) {
  const input = rawInput === undefined || rawInput === null ? "" : String(rawInput).trim();
  if (input === "") return "";
  if (options.currency === "VND") return rawInput;
  if (!isValidCurrencyRate(options.rate)) return options.previousRawVnd || "";
  if (options.previousRawVnd !== undefined && input === String(options.previousViewValue || "").trim()) {
    return options.previousRawVnd;
  }
  const parsed = parseCurrencyAmountToVnd(input, { currency: "CNY", rate: options.rate });
  return parsed.ok ? parsed.serialized : options.previousRawVnd || "";
}

/** @param {unknown} rawAmount @param {unknown} rate */
export function convertCnyAmountToVnd(rawAmount, rate) {
  if (!isValidCurrencyRate(rate)) return null;
  const parsed = parseCurrencyAmountToVnd(rawAmount, { currency: "CNY", rate });
  return parsed.ok ? parsed.serialized : null;
}
