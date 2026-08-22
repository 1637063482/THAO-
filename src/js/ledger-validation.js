const MAX_EXPRESSION_LENGTH = 200;

/** @typedef {{ type: "number" | "+" | "-" | "*" | "/" | "(" | ")"; text: string; value?: number }} LedgerToken */
/** @typedef {{ ok: true; value: number | null; serialized: string }} ParseSuccess */
/** @typedef {{ ok: false; code: string }} ParseFailure */
/** @typedef {ParseSuccess | ParseFailure} ParseResult */

/** @param {string} [code] @returns {ParseFailure} */
function invalid(code = "INVALID_AMOUNT") {
  return { ok: false, code };
}

/** @param {unknown} rawValue */
function normalizeInput(rawValue) {
  return String(rawValue ?? "").replace(/,/g, "").trim();
}

/** @param {string} expression @param {boolean} allowFractional @returns {LedgerToken[]} */
function tokenize(expression, allowFractional) {
  /** @type {LedgerToken[]} */
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    const current = expression[index];
    if (/\s/.test(current)) {
      index += 1;
      continue;
    }
    if (/\d/.test(current) || current === ".") {
      const match = expression.slice(index).match(/^(?:\d+\.\d+|\d+|\.\d+)/);
      if (!match) throw new Error("invalid number");
      const text = match[0];
      if (!allowFractional && text.includes(".")) throw new Error("fractional amount");
      const value = Number(text);
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new Error("unsafe number");
      tokens.push({ type: "number", text: String(value), value });
      index += text.length;
      continue;
    }
    if ("+-*/()".includes(current)) {
      tokens.push({ type: /** @type {LedgerToken["type"]} */ (current), text: current });
      index += 1;
      continue;
    }
    throw new Error("invalid character");
  }
  if (!tokens.length) throw new Error("empty expression");
  return tokens;
}

/** @param {LedgerToken[]} tokens @param {boolean} allowFractional @returns {number} */
function evaluate(tokens, allowFractional) {
  let index = 0;

  /** @param {number} value @returns {number} */
  function check(value) {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new Error("unsafe result");
    if (!allowFractional && !Number.isSafeInteger(value)) throw new Error("fractional result");
    return value;
  }

  /** @returns {number} */
  function factor() {
    const token = tokens[index];
    if (token?.type === "number") {
      index += 1;
      return check(/** @type {number} */ (token.value));
    }
    if (token?.type === "(") {
      index += 1;
      const value = expression();
      if (tokens[index]?.type !== ")") throw new Error("unclosed expression");
      index += 1;
      return value;
    }
    throw new Error("missing operand");
  }

  /** @returns {number} */
  function term() {
    let value = factor();
    while (tokens[index]?.type === "*" || tokens[index]?.type === "/") {
      const operator = tokens[index++].type;
      const right = factor();
      if (operator === "/" && right === 0) throw new Error("division by zero");
      value = check(operator === "*" ? value * right : value / right);
    }
    return value;
  }

  /** @returns {number} */
  function expression() {
    let value = term();
    while (tokens[index]?.type === "+" || tokens[index]?.type === "-") {
      const operator = tokens[index++].type;
      const right = term();
      value = check(operator === "+" ? value + right : value - right);
    }
    return value;
  }

  const value = expression();
  if (index !== tokens.length) throw new Error("unexpected token");
  return check(value);
}

/** @param {unknown} rawValue @param {{ allowFractional: boolean; allowEmpty?: boolean; allowZero?: boolean; requirePositive?: boolean }} options @returns {ParseResult} */
function parseAmount(rawValue, { allowFractional, allowEmpty = false, allowZero = true, requirePositive = false }) {
  const raw = normalizeInput(rawValue);
  if (!raw) return allowEmpty ? { ok: true, value: null, serialized: "" } : invalid();
  if (raw.length > MAX_EXPRESSION_LENGTH) return invalid();
  const expression = raw.startsWith("=") ? raw.slice(1).trim() : raw;
  if (!expression || /[eE]/.test(expression)) return invalid();

  let tokens;
  let value;
  try {
    tokens = tokenize(expression, allowFractional);
    value = evaluate(tokens, allowFractional);
  } catch {
    return invalid();
  }
  if (value < 0 || (!allowZero && value === 0) || (requirePositive && value <= 0)) return invalid();
  if (!allowFractional && !Number.isSafeInteger(value)) return invalid();
  const serializedExpression = tokens.map(token => token.text).join("");
  const hasFormula = raw.startsWith("=") || tokens.some(token => "+-*/()".includes(token.type));
  return { ok: true, value, serialized: hasFormula ? `=${serializedExpression}` : String(value) };
}

/** @param {unknown} value @param {{ allowEmpty?: boolean; allowZero?: boolean; requirePositive?: boolean }} [options] @returns {ParseResult} */
export function parseVndAmount(value, options = {}) {
  return parseAmount(value, {
    allowFractional: false,
    allowEmpty: options.allowEmpty,
    allowZero: options.allowZero,
    requirePositive: options.requirePositive,
  });
}

/** @param {unknown} value @param {{ currency: "VND" | "CNY"; rate?: unknown; allowEmpty?: boolean; allowZero?: boolean; requirePositive?: boolean }} options @returns {ParseResult} */
export function parseCurrencyAmountToVnd(value, options) {
  if (options.currency === "VND") return parseVndAmount(value, options);
  if (typeof options.rate !== "number" || !Number.isFinite(options.rate) || options.rate <= 0) return invalid("INVALID_RATE");
  const parsed = parseAmount(value, { allowFractional: true, allowEmpty: options.allowEmpty, allowZero: options.allowZero });
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return parsed;
  const converted = Math.round(parsed.value * options.rate);
  if (!Number.isSafeInteger(converted) || converted < 0 || (options.requirePositive && converted <= 0)) return invalid();
  if (!options.allowZero && converted === 0) return invalid();
  return { ok: true, value: converted, serialized: String(converted) };
}

/** @param {unknown} value */
export function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
