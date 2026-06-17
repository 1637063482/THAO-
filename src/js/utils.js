// ==========================================
// utils.js - 安全数学解析器 + 格式化工具
// ==========================================
import { DEFAULT_FX_RATE } from "./config.js";

const SAFE_MATH_RE = /^[\d\s+\-*/().eE]+$/;
const MAX_EXPR_LEN = 200;

export function safeEval(expr) {
  if (expr === undefined || expr === null) return 0;
  const str = String(expr).trim();
  if (str === "" || str === "0") return 0;
  const clean = str.startsWith("=") ? str.slice(1) : str;
  if (clean === "" || clean === "0") return 0;
  if (clean.length > MAX_EXPR_LEN) return parseFloat(str) || 0;
  if (!SAFE_MATH_RE.test(clean)) return parseFloat(str) || 0;
  if (/[+\-*/]{2,}/.test(clean)) return parseFloat(str) || 0;
  if (/[+\-*/]$/.test(clean)) return parseFloat(str) || 0;
  try {
    const val = Number(new Function("return (" + clean + ")")());
    if (isNaN(val) || !isFinite(val)) return 0;
    return val;
  } catch { return parseFloat(str) || 0; }
}

let _currencyGetter = () => "VND";
let _rateGetter = () => DEFAULT_FX_RATE;

export function setCurrencyGetter(fn) { _currencyGetter = fn; }
export function setRateGetter(fn) { _rateGetter = fn; }
export function getCurrentCurrency() { return _currencyGetter(); }
export function getActiveRate() { return _rateGetter(); }

export function formatDisplay(vndVal) {
  const val = parseFloat(vndVal) || 0;
  if (_currencyGetter() === "VND") return Math.round(val).toLocaleString("en-US");
  else return (val / _rateGetter()).toFixed(2);
}

export function formatSymbol(vndVal) {
  const symbol = _currencyGetter() === "VND" ? "\u20AB " : "\u00A5 ";
  return symbol + formatDisplay(vndVal);
}

export function ensureFormula(val) {
  if (!val) return "0";
  if (typeof val === "string" && /[+\-*/]/.test(val) && !val.startsWith("=")) return "=" + val;
  return val;
}

let toastTimer = null;
export function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toast-icon");
  const text = document.getElementById("toast-msg");
  if (!toast || !icon || !text) return;
  icon.innerText = isError ? "\u274C" : "\u2705";
  text.innerText = msg;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.style.opacity = '0', 3000);
}

export function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return fallback; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* noop */ }
}
export function lsRemove(key) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}