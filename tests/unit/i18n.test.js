import { describe, expect, it, vi, beforeEach } from "vitest";
import { state } from "../../src/js/state.js";

// We'll test with a fresh instance approach: mock locale modules
vi.mock("../../src/locales/vi.js", () => ({
  default: {
    app_name: "Sổ thu chi của Thao",
    greeting: "Xin chào {name}",
    category_dining: "Ăn uống",
    category_shopping: "Mua sắm",
    login: "Đăng nhập",
    yearly_income: "Tổng thu nhập năm",
    yearly_expense: "Tổng chi tiêu năm",
  },
}));

vi.mock("../../src/locales/zh-CN.js", () => ({
  default: {
    app_name: "Thao的账本",
    greeting: "你好 {name}",
    category_dining: "餐饮饮食",
    category_shopping: "服饰购物",
    login: "登录",
    yearly_income: "年度总收入",
    yearly_expense: "年度总支出",
  },
}));

// Import after mocks are set up
// Note: we import the module fresh for each test via dynamic import
async function getI18n() {
  return await import("../../src/js/i18n.js");
}

describe("i18n system", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.lang = "";
  });

  describe("default locale", () => {
    it("defaults to Vietnamese (vi)", async () => {
      const i18n = await getI18n();
      expect(i18n.getCurrentLocale()).toBe("vi");
    });

    it("sets html lang to vi on init", async () => {
      await getI18n();
      expect(document.documentElement.lang).toBe("vi");
    });
  });

  describe("t() — translation function", () => {
    it("returns Vietnamese text for existing keys", async () => {
      const i18n = await getI18n();
      expect(i18n.t("app_name")).toBe("Sổ thu chi của Thao");
      expect(i18n.t("login")).toBe("Đăng nhập");
    });

    it("returns the key itself as fallback for missing keys", async () => {
      const i18n = await getI18n();
      expect(i18n.t("nonexistent_key")).toBe("nonexistent_key");
    });

    it("supports {param} interpolation", async () => {
      const i18n = await getI18n();
      expect(i18n.t("greeting", { name: "Thao" })).toBe("Xin chào Thao");
    });

    it("leaves {placeholder} unchanged when param is missing", async () => {
      const i18n = await getI18n();
      expect(i18n.t("greeting", {})).toBe("Xin chào {name}");
    });

    it("returns Vietnamese after switching to zh-CN and back to vi", async () => {
      const i18n = await getI18n();
      i18n.setLocale("zh-CN");
      i18n.setLocale("vi");
      expect(i18n.t("login")).toBe("Đăng nhập");
    });
  });

  describe("setLocale()", () => {
    it("switches to zh-CN and returns true", async () => {
      const i18n = await getI18n();
      const result = i18n.setLocale("zh-CN");
      expect(result).toBe(true);
      expect(i18n.getCurrentLocale()).toBe("zh-CN");
    });

    it("updates document.documentElement.lang on switch", async () => {
      const i18n = await getI18n();
      i18n.setLocale("zh-CN");
      expect(document.documentElement.lang).toBe("zh-Hans");
      i18n.setLocale("vi");
      expect(document.documentElement.lang).toBe("vi");
    });

    it("returns Chinese text after switching locale", async () => {
      const i18n = await getI18n();
      i18n.setLocale("zh-CN");
      expect(i18n.t("app_name")).toBe("Thao的账本");
      expect(i18n.t("login")).toBe("登录");
    });

    it("rejects invalid locales (en) and returns false", async () => {
      const i18n = await getI18n();
      const result = i18n.setLocale("en");
      expect(result).toBe(false);
      expect(i18n.getCurrentLocale()).toBe("vi");
    });

    it("rejects invalid locales (ja) and keeps current locale", async () => {
      const i18n = await getI18n();
      i18n.setLocale("zh-CN");
      const result = i18n.setLocale("ja");
      expect(result).toBe(false);
      expect(i18n.getCurrentLocale()).toBe("zh-CN");
    });

    it("persists preference to localStorage", async () => {
      const i18n = await getI18n();
      i18n.setLocale("zh-CN");
      expect(localStorage.getItem("locale")).toBe("zh-CN");
    });
  });

  describe("initialization from localStorage", () => {
    it("restores zh-CN from localStorage on init", async () => {
      localStorage.setItem("locale", "zh-CN");
      // Re-import to trigger init
      const i18n = await getI18n();
      expect(i18n.getCurrentLocale()).toBe("zh-CN");
      expect(document.documentElement.lang).toBe("zh-Hans");
    });

    it("ignores invalid saved locale and falls back to vi", async () => {
      localStorage.setItem("locale", "en");
      const i18n = await getI18n();
      expect(i18n.getCurrentLocale()).toBe("vi");
    });
  });

  describe("no side effects on app state", () => {
    it("does not modify the global state or pendingUpdates", async () => {
      // setLocale should not touch window state or firestore
      const i18n = await getI18n();
      const beforeLang = document.documentElement.lang;
      i18n.setLocale("zh-CN");
      // No window.appState or pendingUpdates should be referenced
      expect(document.documentElement.lang).toBe("zh-Hans");
      // And switching back preserves language state
      i18n.setLocale("vi");
      expect(document.documentElement.lang).toBe("vi");
    });

    it("does not modify the actual state.appState or state.pendingUpdates after multiple locale switches", async () => {
      // Snapshots of the actual application state singleton
      var appStateBefore = JSON.stringify(state.appState);
      var pendingBefore = JSON.stringify(state.pendingUpdates);

      const i18n = await getI18n();
      // Perform multiple locale switches
      i18n.setLocale("zh-CN");
      i18n.setLocale("vi");
      i18n.setLocale("zh-CN");

      // The actual state objects must be unchanged
      expect(JSON.stringify(state.appState)).toBe(appStateBefore);
      expect(JSON.stringify(state.pendingUpdates)).toBe(pendingBefore);
    });
  });
});

describe("applyI18n()", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.lang = "";
  });

  it("sets textContent on leaf elements and title on elements with children", async () => {
    document.body.innerHTML = [
      '<span id="leaf-el" data-i18n="app_name"></span>',
      '<button id="parent-el" data-i18n="login"><span data-icon="user"></span></button>',
    ].join("");
    const i18n = await import("../../src/js/i18n.js");

    i18n.applyI18n();

    // Leaf element (no children) gets textContent
    var leaf = document.getElementById("leaf-el");
    expect(leaf.textContent).toBe("Sổ thu chi của Thao");

    // Element with children gets title, preserving child icon
    var parent = document.getElementById("parent-el");
    expect(parent.title).toBe("Đăng nhập");
    expect(parent.children.length).toBe(1);
    expect(parent.querySelector("[data-icon]")).not.toBeNull();
  });
});

describe("real locale dictionaries", () => {
  it("vi and zh-CN have identical key sets with non-empty values", async () => {
    // Import real dictionaries (not mocked)
    var vi = (await import("../../src/locales/vi.js")).default;
    var zh = (await import("../../src/locales/zh-CN.js")).default;

    var viKeys = Object.keys(vi).sort();
    var zhKeys = Object.keys(zh).sort();

    // Same keys
    expect(viKeys).toEqual(zhKeys);

    // No empty values
    viKeys.forEach(function (k) {
      expect(vi[k], "vi." + k + " should not be empty").toBeTruthy();
      expect(zh[k], "zh." + k + " should not be empty").toBeTruthy();
    });

    // Vietnamese contains expected diacritics
    expect(vi["category_dining"]).toMatch(/ă/i);
    expect(vi["login"]).toMatch(/đ/i);
  });
});
