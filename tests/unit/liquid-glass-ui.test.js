import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const readIfPresent = (path) => existsSync(path) ? read(path) : "";

describe("Liquid Glass UI integration", () => {
  it("loads responsive layout before design tokens", () => {
    const entry = read("src/js/main.js");
    const appStyles = entry.indexOf('../css/app.css');
    const responsiveStyles = entry.indexOf('../css/responsive.css');
    const glassStyles = entry.indexOf('../css/design-system.css');

    expect(appStyles).toBeGreaterThanOrEqual(0);
    expect(responsiveStyles).toBeGreaterThan(appStyles);
    expect(glassStyles).toBeGreaterThan(responsiveStyles);
  });

  it("keeps the lens centered vertically and separates its refraction layer", () => {
    const css = readIfPresent("src/css/design-system.css");

    expect(css).toMatch(/\.bottom-nav-lens\s*\{[^}]*top:\s*7px;[^}]*bottom:\s*7px;/);
    expect(css).toMatch(/\.bottom-nav-lens\s*\{[^}]*transform:\s*translate3d\(var\(--dock-lens-x, 0px\), 0, 0\)[^;]*;[^}]*transform-origin:\s*center;/);
    expect(css).toMatch(/#bottom-nav\.app-bottom-nav\.dock-refraction-ready\s*\{\s*-webkit-backdrop-filter:\s*none;\s*backdrop-filter:\s*none;/);
    expect(css).toMatch(/#bottom-nav\.app-bottom-nav\.dock-refraction-ready \.bottom-nav-lens\s*\{\s*z-index:\s*2;/);
  });

  it("keeps VND display amounts on one line and removes old opaque shell gutters", () => {
    const css = readIfPresent("src/css/design-system.css");
    const appCss = read("src/css/app.css");

    expect(css).toContain(".deposit-metrics strong,");
    expect(css).toMatch(/\.deposit-card-amount\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).toContain(".dashboard-hero .dashboard-budget-value,");
    expect(appCss).not.toMatch(/body::before\s*\{|body::after\s*\{/);
  });

  it("keeps the target sidebar available on desktop and the bottom dock clear of content on mobile", () => {
    const responsiveCss = readIfPresent("src/css/responsive.css");

    expect(responsiveCss).toMatch(/@media\s*\(min-width:\s*768px\)[\s\S]*?#sidebar\.app-sidebar\s*\{[^}]*display:\s*flex/);
    expect(responsiveCss).not.toMatch(/#sidebar\s*\{[^}]*display:\s*none\s*!important/);
    expect(responsiveCss).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*\.app-main-content[^}]*padding-bottom:/);
  });

  it("styles the desktop sidebar as a compact glass surface and rounds the month toolbar", () => {
    const appCss = read("src/css/app.css");
    const responsiveCss = readIfPresent("src/css/responsive.css");
    const glassCss = readIfPresent("src/css/design-system.css");

    expect(`${appCss}\n${responsiveCss}`).not.toMatch(/#sidebar\.app-sidebar\s*\{[^}]*min-height:\s*calc\(100vh/);
    expect(glassCss).toMatch(/#sidebar\.app-sidebar\s*\{[^}]*background:\s*var\(--glass-1-background\)[^}]*backdrop-filter:\s*blur\(12px\)/);
    expect(glassCss).toMatch(/\.dark #sidebar\.app-sidebar\s*\{[^}]*background:\s*var\(--glass-1-background\)/);
    expect(glassCss).toMatch(/\.month-tabs-toolbar\s*\{[^}]*padding:\s*\.35rem[^}]*border-radius:\s*16px/);
  });

  it("shows four dashboard summary cards per row on wide desktop", () => {
    const glassCss = readIfPresent("src/css/design-system.css");

    expect(glassCss).toMatch(/@media\s*\(min-width:\s*1200px\)[\s\S]*?\.dashboard-root\s*>\s*\.grid\.grid-cols-2\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("uses the glass overlay layer for loading, deposit reminders, and update notices", () => {
    const css = readIfPresent("src/css/design-system.css");

    expect(css).toMatch(/#loading-overlay\s*\{[^}]*--z-loading/);
    expect(css).toMatch(/\.deposit-reminder-backdrop\s*\{[^}]*--z-menu/);
    expect(css).toMatch(/\.deposit-reminder-dialog\s*\{[^}]*glass-4-background/);
    expect(css).toMatch(/\.update-toast\s*\{[^}]*glass-4-background/);
  });
});
