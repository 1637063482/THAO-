import { describe, expect, it, vi, beforeEach } from "vitest";

describe("navigation", () => {
  beforeEach(function () {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("exports NAV_ITEMS with only the three page destinations", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(nav.NAV_ITEMS).toBeDefined();
    expect(nav.NAV_ITEMS.map(function (item) { return item.id; })).toEqual(["overview", "savings", "stats"]);
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
    document.body.innerHTML = [
      '<button class="bottom-nav-item active" data-nav="overview">Overview</button>',
      '<button class="bottom-nav-item" data-nav="stats">Stats</button>',
      '<button class="sidebar-item" data-nav="stats">Stats</button>',
      '<button class="sidebar-item" data-nav="overview">Overview</button>',
    ].join("");

    const nav = await import("../../src/js/navigation.js");
    const router = { navigate: vi.fn() };

    nav.initNavigation(router);

    // Click the bottom-nav stats button
    var statsBtn = document.querySelector('.bottom-nav-item[data-nav="stats"]');
    statsBtn.click();

    expect(router.navigate).toHaveBeenCalledWith("stats");
    expect(nav.getActive()).toBe("stats");
    expect(statsBtn.classList.contains("active")).toBe(true);
    var sidebarStats = document.querySelector('.sidebar-item[data-nav="stats"]');
    expect(sidebarStats.classList.contains("active")).toBe(true);
    var overviewBtn = document.querySelector('[data-nav="overview"]');
    expect(overviewBtn.classList.contains("active")).toBe(false);
  });

  it("pressing Enter on a nav item activates both surfaces", async function () {
    document.body.innerHTML = [
      '<button class="bottom-nav-item active" data-nav="overview">Overview</button>',
      '<button class="bottom-nav-item" data-nav="stats">Stats</button>',
      '<button class="sidebar-item" data-nav="stats">Stats</button>',
      '<button class="sidebar-item" data-nav="overview">Overview</button>',
    ].join("");
    const nav = await import("../../src/js/navigation.js");
    const router = { navigate: vi.fn() };
    nav.initNavigation(router);

    var statsBtn = document.querySelector('[data-nav="stats"]');
    var event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    statsBtn.dispatchEvent(event);

    expect(router.navigate).toHaveBeenCalledWith("stats");
    expect(nav.getActive()).toBe("stats");
    expect(statsBtn.classList.contains("active")).toBe(true);
    var sidebarStats = document.querySelector('.sidebar-item[data-nav="stats"]');
    expect(sidebarStats.classList.contains("active")).toBe(true);
    var overviewBtn = document.querySelector('[data-nav="overview"]');
    expect(overviewBtn.classList.contains("active")).toBe(false);
  });

  it("returns a cleanup that removes navigation event bindings", async function () {
    document.body.innerHTML = '<button data-nav="stats">Stats</button>';
    const nav = await import("../../src/js/navigation.js");
    const router = { navigate: vi.fn() };
    const cleanup = nav.initNavigation(router);

    cleanup();
    document.querySelector("[data-nav]").click();

    expect(router.navigate).not.toHaveBeenCalled();
  });

});
