/** @typedef {"system" | "light" | "dark"} ThemeMode */

export const THEME_PREFERENCE_KEY = "thao_dark_mode";

/** @param {Storage} storage @returns {ThemeMode} */
export function readThemeMode(storage) {
  var saved = storage.getItem(THEME_PREFERENCE_KEY);
  if (saved === "system" || saved === "light" || saved === "dark") return saved;

  if (saved === "1" || saved === "0") {
    var migrated = saved === "1" ? "dark" : "light";
    storage.setItem(THEME_PREFERENCE_KEY, migrated);
    return migrated;
  }
  return "system";
}

/** @param {ThemeMode} mode @returns {ThemeMode} */
export function nextThemeMode(mode) {
  return mode === "system" ? "light" : mode === "light" ? "dark" : "system";
}

/** @param {ThemeMode} mode @param {boolean} systemPrefersDark */
export function isDarkTheme(mode, systemPrefersDark) {
  return mode === "dark" || (mode === "system" && systemPrefersDark);
}
