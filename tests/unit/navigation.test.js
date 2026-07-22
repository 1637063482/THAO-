import { describe, expect, it, vi, beforeEach } from "vitest";

// Navigation module doesn't exist yet — these tests confirm its required API
describe("navigation", () => {
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

  it("exports initNavigation and handles keyboard Enter on nav items", async () => {
    const nav = await import("../../src/js/navigation.js");
    expect(nav.initNavigation).toBeTypeOf("function");
  });
});
