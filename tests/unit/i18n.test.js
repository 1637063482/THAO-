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
    var viLocale = (await vi.importActual("../../src/locales/vi.js")).default;
    var zhLocale = (await vi.importActual("../../src/locales/zh-CN.js")).default;

    var viKeys = Object.keys(viLocale).sort();
    var zhKeys = Object.keys(zhLocale).sort();

    // Same keys
    expect(viKeys).toEqual(zhKeys);

    // No empty values
    viKeys.forEach(function (k) {
      expect(viLocale[k], "vi." + k + " should not be empty").toBeTruthy();
      expect(zhLocale[k], "zh." + k + " should not be empty").toBeTruthy();
    });

    // Interpolation contracts are part of the translation contract: a locale
    // must not silently drop a value used by the rendering code.
    const placeholders = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    viKeys.forEach(function (k) {
      expect(placeholders(viLocale[k]), "vi." + k + " placeholders").toEqual(placeholders(zhLocale[k]));
    });

    // Vietnamese contains expected diacritics
    expect(viLocale["category_dining"]).toMatch(/ă/i);
    expect(viLocale["login"]).toMatch(/đ/i);
  });

  it("keeps audited contextual translations aligned", async () => {
    var viLocale = (await vi.importActual("../../src/locales/vi.js")).default;
    var zhLocale = (await vi.importActual("../../src/locales/zh-CN.js")).default;

    expect(viLocale.app_subtitle).toBe("Đồng bộ đám mây · Chia sẻ gia đình · An toàn dữ liệu");
    expect(zhLocale.app_subtitle).toBe("云端协同 · 家人共享 · 数据安全");
    expect(viLocale.monthly).toBe("Tháng {month}");
    expect(zhLocale.monthly).toBe("{month}月");
    expect(viLocale.category_utilities).toBe("Điện, nước & gas");
    expect(zhLocale.category_utilities).toBe("水电燃气");
    expect(viLocale.syncing_year_switch).toBe("Dữ liệu đang đồng bộ, vui lòng chờ đồng bộ xong rồi đổi năm");
    expect(zhLocale.syncing_year_switch).toBe("数据正在同步中，请稍后切换年份");
  });

  it("uses approved Vietnamese wording for ledger actions, categories, and reconciliation", async () => {
    var viLocale = (await vi.importActual("../../src/locales/vi.js")).default;
    var zhLocale = (await vi.importActual("../../src/locales/zh-CN.js")).default;

    expect(viLocale.loading_data).toBe("Đang tải dữ liệu đám mây...");
    expect(viLocale.yearly_expense_record).toBe("Ghi chép chi tiêu năm");
    expect(viLocale.switch_year).toBe("Đổi năm");
    expect(viLocale.import_label).toBe("Nhập dữ liệu");
    expect(viLocale.quick_add).toBe("Ghi chép");
    expect(viLocale.confirm).toBe("Lưu thu chi");
    expect(viLocale.wechat).toBe("Ví WeChat Pay");
    expect(viLocale.year_end_wechat).toBe("Ví WeChat Pay cuối năm");
    expect(viLocale.category_shopping).toBe("Mua sắm & quần áo");
    expect(viLocale.category_rent).toBe("Tiền thuê nhà & trả góp mua nhà");
    expect(viLocale.category_transport).toBe("Đi lại");
    expect(viLocale.category_telecom).toBe("Điện thoại & Internet");
    expect(viLocale.category_entertainment).toBe("Giải trí & thư giãn");
    expect(viLocale.category_health).toBe("Y tế & sức khỏe");
    expect(viLocale.category_other).toBe("Chi tiêu khác");
    expect(viLocale.reconciliation_diff).toBe("Chênh lệch đối chiếu (③-②)");
    expect(viLocale.no_data).toBe("Chưa có dữ liệu");
    expect(viLocale.surplus).toBe("Thừa · thực tế nhiều hơn sổ sách");
    expect(viLocale.deficit).toBe("Thiếu · có thể có khoản chưa ghi");
    expect(viLocale.balanced).toBe("Khớp sổ sách ✓");
    expect(viLocale.link_copy_failed).toBe("Sao chép liên kết thất bại, vui lòng sao chép thủ công địa chỉ trong trình duyệt");
    expect(viLocale.enter_valid_amount).toBe("Vui lòng nhập số tiền hợp lệ (chỉ nhập số)");
    expect(viLocale.total).toBe("Tổng cộng");
    expect(viLocale.year_month_title).toBe("Tháng {month}/{year}");
    expect(viLocale.not_recorded_yet).toBe("THAO ơi, hôm nay chưa ghi chép nhé~");
    expect(viLocale.streak_encouragement).toBe("Tuyệt vời, THAO! Bạn đã duy trì {days} ngày, hãy tiếp tục nhé!");
    expect(viLocale.login_timeout).toBe("Hết thời gian chờ đăng nhập. Vui lòng kiểm tra kết nối rồi thử lại.");
    expect(viLocale.import_dangerous_text).toBe("Nội dung tệp chứa văn bản không an toàn");
    expect(viLocale.syncing_year_switch).toBe("Dữ liệu đang đồng bộ, vui lòng chờ đồng bộ xong rồi đổi năm");

    expect(zhLocale.year_end_assets).toBe("{year}年末资产盘点");
    expect(zhLocale.wechat).toBe("微信钱包");
    expect(zhLocale.year_end_wechat).toBe("年末微信钱包");
    expect(zhLocale.link_copy_failed).toBe("链接复制失败，请手动复制浏览器地址");
  });
});
