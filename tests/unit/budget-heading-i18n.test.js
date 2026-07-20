import { describe, expect, it, vi, beforeEach } from "vitest";

describe("budget heading render integration", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("renders budget heading with localized month and budget label, and switches locale", async () => {
    // Setup: renderMonthTable requires a DOM container and activeYear
    document.body.innerHTML = '<div id="months-container"></div>';

    // Import dependencies — no mocks, using real modules
    const { state } = await import("../../src/js/state.js");
    const { renderMonthTable } = await import("../../src/js/render.js");
    const i18nModule = await import("../../src/js/i18n.js");

    state.activeYear = 2026;

    // Verify container exists
    var container = document.getElementById("months-container");
    expect(container).not.toBeNull();

    // Default locale is vi — render July
    expect(i18nModule.getCurrentLocale()).toBe("vi");
    renderMonthTable(7);

    // Assert the actual DOM content produced by the renderer
    // The budget heading is: <span id="budget-label-month">7</span> Ngân sách
    var budgetLabel = document.getElementById("budget-label-month");
    expect(budgetLabel).not.toBeNull();
    expect(budgetLabel.textContent).toBe("7");
    // The month span is followed by a text node with the budget label
    expect(container.innerHTML).toContain("Ngân sách");
    expect(container.innerHTML).not.toContain("预算");

    // Switch to zh-CN and re-render
    i18nModule.setLocale("zh-CN");
    renderMonthTable(7);
    expect(container.innerHTML).toContain("7");
    expect(container.innerHTML).toContain("预算");
    expect(container.innerHTML).not.toContain("Ngân sách");

    // Switch back to vi and verify
    i18nModule.setLocale("vi");
    renderMonthTable(7);
    expect(container.innerHTML).toContain("Ngân sách");
  });
});
