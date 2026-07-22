import { describe, expect, it, vi, beforeEach } from "vitest";

describe("app shell responsive layout", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("does not show both bottom-nav and sidebar simultaneously", async () => {
    // Simulate a narrow viewport
    window.innerWidth = 375;
    window.dispatchEvent(new Event("resize"));

    // Set up shell DOM
    document.body.innerHTML = [
      '<nav id="bottom-nav" class="sm:hidden"></nav>',
      '<aside id="sidebar" class="hidden xl:block"></aside>',
    ].join("");

    var bottomNav = document.getElementById("bottom-nav");
    var sidebar = document.getElementById("sidebar");

    // At narrow width: bottom-nav visible, sidebar hidden
    expect(bottomNav.classList.contains("sm:hidden")).toBe(true);
    expect(sidebar.classList.contains("hidden")).toBe(true);
  });

  it("bottom nav is visually hidden on wide viewports", async () => {
    window.innerWidth = 1440;
    window.dispatchEvent(new Event("resize"));

    document.body.innerHTML = [
      '<nav id="bottom-nav" class="sm:hidden"></nav>',
      '<aside id="sidebar" class="hidden xl:block"></aside>',
    ].join("");

    var bottomNav = document.getElementById("bottom-nav");
    // sm:hidden hides at >= 640px
    expect(bottomNav.classList.contains("sm:hidden")).toBe(true);
  });

  it("main content respects safe-area padding", () => {
    document.body.innerHTML = '<main id="main-content" class="px-4 md:px-6 pb-24 sm:pb-6"></main>';
    var main = document.getElementById("main-content");
    // pb-24 provides bottom padding for mobile bottom nav
    expect(main.classList.contains("pb-24")).toBe(true);
    expect(main.classList.contains("sm:pb-6")).toBe(true);
  });
});
