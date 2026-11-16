import { beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const themeModePath = resolve("src/js/theme-mode.js");

async function loadThemeMode() {
  if (!existsSync(themeModePath)) return null;
  let importError;
  const theme = await import(/* @vite-ignore */ pathToFileURL(themeModePath).href).catch((error) => {
    importError = error;
    return null;
  });
  return theme || { importError };
}

describe("girlfriend app theme preference", () => {
  beforeEach(() => localStorage.clear());

  it("uses the existing thao_dark_mode key for system, light, and dark modes", async () => {
    const theme = await loadThemeMode();
    expect(theme).not.toBeNull();
    expect(theme?.importError).toBeUndefined();
    if (!theme || theme.importError) return;

    expect(theme.THEME_PREFERENCE_KEY).toBe("thao_dark_mode");
    expect(theme.readThemeMode(localStorage)).toBe("system");
    expect(theme.isDarkTheme("system", true)).toBe(true);
    expect(theme.isDarkTheme("system", false)).toBe(false);

    localStorage.setItem("thao_dark_mode", "1");
    expect(theme.readThemeMode(localStorage)).toBe("dark");
    expect(localStorage.getItem("thao_dark_mode")).toBe("dark");

    localStorage.setItem("thao_dark_mode", "0");
    expect(theme.readThemeMode(localStorage)).toBe("light");
    expect(localStorage.getItem("thao_dark_mode")).toBe("light");
    expect(localStorage.getItem("personal_expense_theme")).toBeNull();
  });

  it("cycles system, light, and dark and resolves the selected appearance", async () => {
    const theme = await loadThemeMode();
    expect(theme).not.toBeNull();
    expect(theme?.importError).toBeUndefined();
    if (!theme || theme.importError) return;

    expect(theme.nextThemeMode("system")).toBe("light");
    expect(theme.nextThemeMode("light")).toBe("dark");
    expect(theme.nextThemeMode("dark")).toBe("system");
    expect(theme.isDarkTheme("dark", false)).toBe(true);
    expect(theme.isDarkTheme("light", true)).toBe(false);
  });

  it("provides theme-mode labels in Vietnamese and Chinese", async () => {
    const { setLocale, t } = await import("../../src/js/i18n.js");
    setLocale("vi");
    expect(t("theme_mode_system")).not.toBe("theme_mode_system");
    expect(t("theme_mode_light")).not.toBe("theme_mode_light");
    expect(t("theme_mode_dark")).not.toBe("theme_mode_dark");

    setLocale("zh-CN");
    expect(t("theme_mode_system")).not.toBe("theme_mode_system");
    expect(t("theme_mode_light")).not.toBe("theme_mode_light");
    expect(t("theme_mode_dark")).not.toBe("theme_mode_dark");
    setLocale("vi");
  });
});
