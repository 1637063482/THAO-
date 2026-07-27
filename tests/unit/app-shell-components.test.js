import { beforeEach, describe, expect, it, vi } from "vitest";

describe("app shell components", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.lang = "vi";
    document.body.innerHTML = [
      '<header data-app-header-host></header>',
      '<aside id="sidebar" data-app-sidebar-host></aside>',
      '<nav id="bottom-nav" data-app-bottom-nav-host></nav>',
    ].join("");
  });

  it("renders the header and command menu with the existing critical IDs", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");

    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));

    [
      "year-selector",
      "display-year-text",
      "btn-lang-vi",
      "btn-lang-zh",
      "btn-curr-vnd",
      "btn-curr-cny",
      "fx-panel",
      "btn-theme",
      "btn-privacy",
      "nav-more-btn",
      "nav-secondary",
      "sync-status",
      "sync-status-text",
      "import-file",
    ].forEach((id) => expect(document.getElementById(id)).not.toBeNull());
  });

  it("generates desktop and mobile destinations from the same destination data", async () => {
    const { NAV_ITEMS } = await import("../../src/js/navigation.js");
    const { renderSidebar } = await import("../../src/components/app-shell/sidebar.js");
    const { renderBottomNav } = await import("../../src/components/app-shell/bottom-nav.js");

    renderSidebar(document.getElementById("sidebar"));
    renderBottomNav(document.getElementById("bottom-nav"));

    const expected = NAV_ITEMS.map((item) => item.id);
    const sidebarItems = Array.from(document.querySelectorAll("#sidebar [data-nav]"), (element) => element.dataset.nav);
    const bottomItems = Array.from(document.querySelectorAll("#bottom-nav [data-nav]"), (element) => element.dataset.nav);
    expect(sidebarItems).toEqual(expected);
    expect(bottomItems).toEqual(expected);
  });

  it("applies both Vietnamese and Chinese translations after dynamic rendering", async () => {
    const { renderSidebar } = await import("../../src/components/app-shell/sidebar.js");
    const { applyI18n, setLocale } = await import("../../src/js/i18n.js");
    renderSidebar(document.getElementById("sidebar"));

    applyI18n();
    expect(document.querySelector('[data-nav="overview"] span:last-child').textContent).toBe("Tổng quan");

    setLocale("zh-CN");
    applyI18n();
    expect(document.querySelector('[data-nav="overview"] span:last-child').textContent).toBe("总览");
  });

  it("binds and unbinds the command menu without duplicate global handlers", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { bindCommandMenu, renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");
    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));

    const unbind = bindCommandMenu(document);
    const button = document.getElementById("nav-more-btn");
    const panel = document.getElementById("nav-secondary");
    button.click();
    expect(panel.classList.contains("open")).toBe(true);

    unbind();
    button.click();
    expect(panel.classList.contains("open")).toBe(true);
  });
});
