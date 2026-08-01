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
    const { bindCommandMenu, renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");

    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));
    bindCommandMenu(document);

    [
      "year-selector",
      "btn-lang-vi",
      "btn-lang-zh",
      "btn-curr-vnd",
      "btn-curr-cny",
      "fx-panel",
      "btn-theme",
      "btn-privacy",
      "btn-logout",
      "nav-more-btn",
      "nav-secondary",
      "sync-status",
      "sync-status-text",
      "import-file",
    ].forEach((id) => expect(document.getElementById(id)).not.toBeNull());
  });

  it("uses compact vertical padding for the top navigation content", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const header = document.querySelector("[data-app-header-host]");

    renderHeader(header);

    const content = header.querySelector(".app-header-content");
    expect(content.classList.contains("py-2")).toBe(true);
    expect(content.classList.contains("py-2.5")).toBe(false);
    expect(header.querySelector("#year-selector .app-dropdown-chevron")).toBeNull();
  });

  it("renders the command menu as a centered modal with an explicit close control", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { bindCommandMenu, renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");

    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));
    bindCommandMenu(document);

    const menu = document.getElementById("nav-secondary");
    expect(menu.classList.contains("app-confirmation-backdrop")).toBe(true);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.closest("[data-app-header-host]")).toBeNull();
    expect(menu.querySelector(".app-command-menu-dialog").getAttribute("role")).toBe("dialog");
    expect(menu.querySelector(".app-command-menu-dialog").getAttribute("aria-modal")).toBe("true");
    expect(menu.querySelector(".app-command-menu-dialog").getAttribute("aria-labelledby")).toBe("nav-secondary-title");
    expect(menu.querySelector(".app-command-menu-dialog").classList.contains("app-confirmation-dialog")).toBe(true);
    expect(menu.querySelector("#nav-secondary-close")).not.toBeNull();
    expect(menu.querySelector("#btn-theme [data-i18n=\"toggle_theme\"]")).not.toBeNull();
    expect(menu.querySelector("#btn-privacy [data-i18n=\"toggle_privacy\"]")).not.toBeNull();
    expect(menu.querySelector("#btn-theme").getAttribute("data-i18n-aria-label")).toBe("toggle_theme");
    expect(menu.querySelector("#btn-privacy").getAttribute("data-i18n-aria-label")).toBe("toggle_privacy");
    expect(menu.querySelector('[data-command="import"] [data-icon="download"]')).not.toBeNull();
    expect(menu.querySelector('[data-command="export"] [data-icon="upload"]')).not.toBeNull();
    expect(menu.querySelectorAll(".app-command-menu-section")).toHaveLength(3);
    expect(menu.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the manual FX input hidden until manual mode is selected", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");

    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));

    expect(document.getElementById("manual-rate-input").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("manual-rate-input").disabled).toBe(true);
    expect(document.getElementById("manual-rate-input").value).toBe("3700");
    expect(document.getElementById("manual-rate-input").getAttribute("placeholder")).toBe("3700");
  });

  it("renders Apple-style shell landmarks without changing navigation contracts", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { renderSidebar } = await import("../../src/components/app-shell/sidebar.js");
    const { renderBottomNav } = await import("../../src/components/app-shell/bottom-nav.js");
    const header = document.querySelector("[data-app-header-host]");
    const sidebar = document.getElementById("sidebar");
    const bottomNav = document.getElementById("bottom-nav");

    renderHeader(header);
    renderSidebar(sidebar);
    renderBottomNav(bottomNav);

    expect(header.classList.contains("app-header")).toBe(true);
    expect(header.querySelector(".app-header-year-control")).not.toBeNull();
    expect(header.querySelector("#sync-status").getAttribute("role")).toBe("status");
    expect(header.querySelector("#sync-status").getAttribute("aria-live")).toBe("polite");
    expect(sidebar.classList.contains("app-sidebar")).toBe(true);
    expect(bottomNav.classList.contains("app-bottom-nav")).toBe(true);
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
    expect(document.body.classList.contains("app-modal-open")).toBe(true);

    document.getElementById("nav-secondary-close").click();
    expect(panel.classList.contains("open")).toBe(false);
    expect(document.body.classList.contains("app-modal-open")).toBe(false);
    expect(document.activeElement).toBe(button);

    button.click();
    expect(panel.classList.contains("open")).toBe(true);

    unbind();
    button.click();
    expect(panel.classList.contains("open")).toBe(true);
  });

  it("keeps year and sync status primary while placing low-frequency commands in the menu", async () => {
    const { mountSyntheticAppShell } = await import("../fixtures/app-shell-synthetic-state.js");
    const header = mountSyntheticAppShell(document.querySelector("[data-app-header-host]"));
    const menu = document.querySelector("#nav-secondary");

    expect(header.querySelector("#year-selector")).not.toBeNull();
    expect(header.querySelector("#sync-status").closest("#nav-secondary")).toBeNull();
    ["import", "export", "share", "language", "theme", "privacy", "logout"].forEach((command) => {
      expect(menu.querySelector(`[data-command="${command}"]`)).not.toBeNull();
    });
    expect(menu.querySelector('[data-command="logout"] [data-i18n="logout"]')).not.toBeNull();
  });

  it("closes the command menu with Escape and restores focus to its trigger", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { bindCommandMenu, renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");
    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));

    const unbind = bindCommandMenu(document);
    const button = document.getElementById("nav-more-btn");
    const panel = document.getElementById("nav-secondary");
    button.click();
    expect(document.body.classList.contains("app-modal-open")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(panel.classList.contains("open")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.classList.contains("app-modal-open")).toBe(false);
    expect(document.activeElement).toBe(button);
    unbind();
  });

  it("closes the command menu when the user clicks outside it", async () => {
    const { renderHeader } = await import("../../src/components/app-shell/header.js");
    const { bindCommandMenu, renderCommandMenu } = await import("../../src/components/app-shell/command-menu.js");
    const header = document.querySelector("[data-app-header-host]");
    renderHeader(header);
    renderCommandMenu(header.querySelector("[data-app-command-menu-host]"));

    const unbind = bindCommandMenu(document);
    const button = document.getElementById("nav-more-btn");
    const panel = document.getElementById("nav-secondary");
    button.click();
    panel.click();

    expect(panel.classList.contains("open")).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(document.body.classList.contains("app-modal-open")).toBe(false);
    unbind();
  });
});
