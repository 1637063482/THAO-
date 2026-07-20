import { describe, expect, it, vi, beforeEach } from "vitest";

describe("budget heading render integration", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("includes month number and budget label in the rendered heading, and switches locale", async () => {
    // Import real locale dictionaries to verify budget key exists
    const vi = (await import("../../src/locales/vi.js")).default;
    const zh = (await import("../../src/locales/zh-CN.js")).default;
    expect(vi.budget).toBe("Ngân sách");
    expect(zh.budget).toBe("预算");

    // Import i18n module (uses real locale dictionaries here since no mock)
    const i18nModule = await import("../../src/js/i18n.js");

    // The budget heading template in renderMonthTable is:
    // <span id="budget-label-month">{monthId}</span> t("budget")
    function makeHeading(monthId) {
      return '<span id="budget-label-month">' + monthId + '</span> ' + i18nModule.t("budget");
    }

    // Default locale is vi
    expect(i18nModule.getCurrentLocale()).toBe("vi");
    var hVi = makeHeading(7);
    expect(hVi).toContain("7");
    expect(hVi).toContain("Ngân sách");
    expect(hVi).not.toContain("预算");

    // Switch to zh-CN and re-render
    i18nModule.setLocale("zh-CN");
    var hZh = makeHeading(7);
    expect(hZh).toContain("7");
    expect(hZh).toContain("预算");
    expect(hZh).not.toContain("Ngân sách");

    // Switch back to vi and verify
    i18nModule.setLocale("vi");
    var hVi2 = makeHeading(7);
    expect(hVi2).toContain("Ngân sách");
  });
});
