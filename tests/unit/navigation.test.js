import { describe, expect, it, vi, beforeEach } from "vitest";

describe("navigation", () => {
  beforeEach(function () {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("exports NAV_ITEMS with 5 destinations", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(nav.NAV_ITEMS).toBeDefined();
    expect(nav.NAV_ITEMS.length).toBe(5);
  });

  it("each NAV_ITEM has id, labelKey, icon, and route", async () => {
    const nav = await import("../../src/js/navigation.js");
    nav.NAV_ITEMS.forEach(function (item) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("labelKey");
      expect(item).toHaveProperty("icon");
      expect(item).toHaveProperty("route");
    });
  });

  it("exports getActive and setActive functions", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(nav.getActive).toBeTypeOf("function");
    expect(nav.setActive).toBeTypeOf("function");
  });

  it("setActive updates active item and returns it", async () => {
    const nav = await import("../../src/js/navigation.js");
    nav.setActive("stats");
    expect(nav.getActive()).toBe("stats");
  });

  it("setActive rejects unknown item IDs", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(function () { nav.setActive("bogus"); }).toThrow();
  });

  it("exports initNavigation and navigateTo", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(nav.initNavigation).toBeTypeOf("function");
    expect(nav.navigateTo).toBeTypeOf("function");
  });

  it("navigateTo + initNavigation activates the clicked nav item and updates both surfaces", async function () {
    // Set up both nav surfaces
    document.body.innerHTML = [
      '<button class="bottom-nav-item active" data-nav="overview">Overview</button>',
      '<button class="bottom-nav-item" data-nav="stats">Stats</button>',
      '<button class="sidebar-item" data-nav="stats">Stats</button>',
    ].join("");

    const nav = await import("../../src/js/navigation.js");
    // Mock window handlers
    window.switchMobileView = vi.fn();

    nav.initNavigation();

    // Click the bottom-nav stats button
    var statsBtn = document.querySelector('.bottom-nav-item[data-nav="stats"]');
    statsBtn.click();

    expect(nav.getActive()).toBe("stats");
    // Both surfaces should have active class
    expect(statsBtn.classList.contains("active")).toBe(true);
    var sidebarStats = document.querySelector('.sidebar-item[data-nav="stats"]');
    expect(sidebarStats.classList.contains("active")).toBe(true);
    // The previously active item should be inactive
    var overviewBtn = document.querySelector('[data-nav="overview"]');
    expect(overviewBtn.classList.contains("active")).toBe(false);
    // The correct handler was called
    expect(window.switchMobileView).toHaveBeenCalledWith("stats");
  });

  it("pressing Enter on a nav item activates it", async function () {
    document.body.innerHTML = [
      '<button class="bottom-nav-item active" data-nav="overview">Overview</button>',
      '<button class="bottom-nav-item" data-nav="stats">Stats</button>',
    ].join("");
    window.switchMobileView = vi.fn();

    const nav = await import("../../src/js/navigation.js");
    nav.initNavigation();

    var statsBtn = document.querySelector('[data-nav="stats"]');
    var event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    statsBtn.dispatchEvent(event);

    expect(nav.getActive()).toBe("stats");
    expect(statsBtn.classList.contains("active")).toBe(true);
    expect(window.switchMobileView).toHaveBeenCalledWith("stats");
  });
});
