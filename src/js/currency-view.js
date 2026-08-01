import { formatVndInputValue } from "./vnd-input.js";

export function isValidCurrencyRate(rate) {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

export function normalizeCurrencyInput(rawValue) {
  return String(rawValue ?? "").replace(/,/g, "").trim();
}

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

export function formatVndForCurrencyDisplay(vndVal, currency, rate) {
  const val = parseFloat(vndVal) || 0;
  if (currency === "VND") return Math.round(val).toLocaleString("en-US");
  if (!isValidCurrencyRate(rate)) return "汇率不可用";
  return (val / rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatVndForCurrencyInput(rawVnd, currency, rate) {
  if (rawVnd === undefined || rawVnd === null || rawVnd === "") return "";
  if (currency === "VND") return String(rawVnd);
  if (!isValidCurrencyRate(rate)) return "";
  const vndVal = parseFloat(rawVnd) || 0;
  return vndVal ? String(parseFloat((vndVal / rate).toFixed(2))) : "";
}

export function parseCurrencyInputToVnd(rawInput, options) {
  const input = rawInput === undefined || rawInput === null ? "" : String(rawInput).trim();
  if (input === "") return "";
  if (options.currency === "VND") return rawInput;
  if (!isValidCurrencyRate(options.rate)) return options.previousRawVnd || "";
  if (options.previousRawVnd !== undefined && input === String(options.previousViewValue || "").trim()) {
    return options.previousRawVnd;
  }
  return (options.evaluate(input) * options.rate).toString();
}

export function convertCnyAmountToVnd(rawAmount, rate) {
  if (!isValidCurrencyRate(rate)) return null;
  return (parseFloat(rawAmount) * rate).toString();
}
