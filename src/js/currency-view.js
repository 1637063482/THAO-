export function formatVndForCurrencyDisplay(vndVal, currency, rate) {
  const val = parseFloat(vndVal) || 0;
  if (currency === "VND") return Math.round(val).toLocaleString("en-US");
  return (val / rate).toFixed(2);
}

export function formatVndForCurrencyInput(rawVnd, currency, rate) {
  if (rawVnd === undefined || rawVnd === null || rawVnd === "") return "";
  if (currency === "VND") return String(rawVnd);
  const vndVal = parseFloat(rawVnd) || 0;
  return vndVal ? String(parseFloat((vndVal / rate).toFixed(2))) : "";
}

export function parseCurrencyInputToVnd(rawInput, options) {
  const input = rawInput === undefined || rawInput === null ? "" : String(rawInput).trim();
  if (input === "") return "";
  if (options.currency === "VND") return rawInput;
  if (options.previousRawVnd !== undefined && input === String(options.previousViewValue || "").trim()) {
    return options.previousRawVnd;
  }
  return (options.evaluate(input) * options.rate).toString();
}

export function convertCnyAmountToVnd(rawAmount, rate) {
  return (parseFloat(rawAmount) * rate).toString();
}
