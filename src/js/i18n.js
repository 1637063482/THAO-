/**
 * i18n — Vietnamese-first internationalization system.
 *
 * Default locale: vi (Vietnamese)
 * Supported: vi, zh-CN (Simplified Chinese)
 * No English option.
 */

import vi from "../locales/vi.js";
import zhCN from "../locales/zh-CN.js";

const VALID_LOCALES = ["vi", "zh-CN"];
const FALLBACK_LOCALE = "vi";

let currentLocale = "vi";
/** @type {Record<string, Record<string, string>>} */
const dictionaries = { vi, "zh-CN": zhCN };

/**
 * Get the current active locale.
 * @returns {string}
 */
export function getCurrentLocale() {
  return currentLocale;
}

/**
 * Translate a message key.
 *
 * @param {string} key - The message key.
 * @param {object} [params] - Optional interpolation parameters: {key: value}.
 * @returns {string} The translated string, or the key itself if not found.
 */
/** @param {string} key @param {Record<string, unknown>} [params] @returns {string} */
export function t(key, params) {
  const msg =
    dictionaries[currentLocale]?.[key] ??
    dictionaries[FALLBACK_LOCALE]?.[key];
  if (msg === undefined || msg === null) return key;
  if (!params || typeof params !== "object") return msg;
  return msg.replace(/\{(\w+)\}/g, /** @param {string} _ @param {string} k */ (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

/**
 * Switch the active locale.
 *
 * @param {string} locale - One of "vi" or "zh-CN".
 * @returns {boolean} true if the switch succeeded, false if the locale is invalid.
 */
export function setLocale(locale) {
  if (!VALID_LOCALES.includes(locale)) return false;
  if (locale === currentLocale) return true;
  currentLocale = locale;
  // Use zh-Hans for lang attribute (standard IETF BCP 47)
  document.documentElement.lang = locale === "zh-CN" ? "zh-Hans" : "vi";
  localStorage.setItem("locale", locale);
  window.dispatchEvent(
    new CustomEvent("locale-changed", { detail: { locale } })
  );
  return true;
}

/**
 * Apply translations to all elements with data-i18n attribute.
 * For elements that need interpolation, set data-i18n-params to a JSON object.
 */
export function applyI18n() {
  document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label") || ""));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder") || ""));
  });
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n") || "";
    var params = null;
    var paramsRaw = el.getAttribute("data-i18n-params");
    if (paramsRaw) {
      try { params = JSON.parse(paramsRaw); } catch (_) { /* ignore */ }
    }
    // If the element has child elements (e.g. icon <span> inside a button),
    // setting textContent would destroy them. Instead set the title attribute
    // so the tooltip is localized while preserving the icon children.
    if (el.children.length > 0) {
      /** @type {HTMLElement} */ (el).title = t(key, params || undefined);
    } else {
      el.textContent = t(key, params || undefined);
    }
  });
}

/**
 * Initialize locale from persisted preference.
 */
function initI18n() {
  var saved = localStorage.getItem("locale");
  if (saved && VALID_LOCALES.includes(saved)) {
    currentLocale = saved;
  }
  document.documentElement.lang =
    currentLocale === "zh-CN" ? "zh-Hans" : "vi";
}

// Run on module load
initI18n();
