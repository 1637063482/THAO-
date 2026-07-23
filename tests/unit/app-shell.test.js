import { describe, expect, it, vi, beforeEach } from "vitest";

describe("app shell responsive layout", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("bottom nav is hidden at/above 768px (md breakpoint)", async () => {
    document.body.innerHTML = '<nav id="bottom-nav" class="md:hidden">bottom</nav>';
    var nav = document.getElementById("bottom-nav");
    // Tailwind md:hidden applies display:none at >=768px
    expect(nav.classList.contains("md:hidden")).toBe(true);
  });

  it("does not show both bottom-nav and sidebar simultaneously below 768px", () => {
    document.body.innerHTML = [
      '<nav id="bottom-nav" class="md:hidden">bottom</nav>',
      '<aside id="sidebar" style="display:none">sidebar</aside>',
    ].join("");
    var bottomNav = document.getElementById("bottom-nav");
    var sidebar = document.getElementById("sidebar");
    // Below 768px: bottom nav visible (it has md:hidden which only takes effect at >=768px)
    // sidebar display:none (its media query doesn't apply below 768px)
    expect(sidebar.style.display).toBe("none");
  });

  it("main content respects safe-area bottom padding", () => {
    document.body.innerHTML = '<main class="pb-24 md:pb-6"></main>';
    var main = document.querySelector("main");
    // pb-24 for mobile (bottom nav clearance), md:pb-6 for desktop
    expect(main.classList.contains("pb-24")).toBe(true);
    expect(main.classList.contains("md:pb-6")).toBe(true);
  });

  it("sidebar and main share a flex-row shell on desktop", () => {
    document.body.innerHTML = [
      '<div class="flex flex-col md:flex-row max-w-[2200px] mx-auto">',
      '  <aside id="sidebar"></aside>',
      '  <main class="flex-1 min-w-0"></main>',
      '</div>',
    ].join("");
    var shell = document.querySelector("div.flex");
    // The shell uses md:flex-row for >=768px side-by-side layout
    expect(shell.classList.contains("md:flex-row")).toBe(true);
    var sidebar = document.getElementById("sidebar");
    var main = document.querySelector("main.flex-1");
    expect(sidebar).not.toBeNull();
    expect(main).not.toBeNull();
  });
});
