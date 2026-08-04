import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/css/app.css", "utf8");
const extractRule = selector => css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] || "";
const headerRule = extractRule("\\.app-header");
const darkHeaderRule = extractRule("\\.dark \\.app-header");
const headerContentRule = extractRule("\\.app-header-content");
const headerYearRule = extractRule("\\.app-header-year-control");
const headerYearTriggerRule = extractRule("\\.app-header-year-control \\.app-dropdown-trigger");
const appBottomRule = extractRule("#bottom-nav\\.app-bottom-nav");
const bottomRule = css.match(/#bottom-nav\s*\{(?=[^}]*left:\s*0\.75rem)([^}]*)\}/)?.[1] || "";
const darkBottomRule = extractRule("\\.dark #bottom-nav");
const topBackdropRule = extractRule("body::before");
const bottomBackdropRule = extractRule("body::after");
const commandBackdropRule = extractRule("#nav-secondary");
const commandDialogRule = extractRule("\.app-command-menu-dialog");
const commandFlipStartRule = extractRule("#nav-secondary \.app-command-menu-dialog--flip-start");
const commandFlipCloseRule = extractRule("#nav-secondary\.closing \.app-command-menu-dialog--flip-close");
const preferenceButtonRule = css.match(/\.app-command-menu-preferences \.btn-ghost,\s*\.app-command-menu-actions \.btn-ghost,\s*\.app-command-menu-actions \.btn-primary,\s*\.app-command-menu-actions \.btn-danger\s*\{([^}]*)\}/)?.[1] || "";
const commandSegmentRule = css.match(/\.app-command-menu-preferences \.app-segment,\s*\.app-command-menu-currency \.app-segment\s*\{([^}]*)\}/)?.[1] || "";
const commandSegmentButtonRule = css.match(/\.app-command-menu-preferences \.app-segment > \.month-tab,\s*\.app-command-menu-currency \.app-segment > \.month-tab\s*\{([^}]*)\}/)?.[1] || "";

describe("Apple UI shell chrome", () => {
  it("keeps the top navigation compact without changing its floating shell", () => {
    expect(headerContentRule).toMatch(/min-height:\s*52px/);
    expect(headerYearRule).toMatch(/min-height:\s*0/);
    expect(headerYearRule).toMatch(/padding:\s*0/);
    expect(headerYearRule).toMatch(/border:\s*none/);
    expect(headerYearRule).toMatch(/background:\s*transparent/);
    expect(headerYearTriggerRule).toMatch(/min-height:\s*0/);
    expect(headerYearTriggerRule).toMatch(/font-size:\s*inherit/);
    expect(headerYearTriggerRule).toMatch(/font-weight:\s*inherit/);
    expect(headerYearTriggerRule).toMatch(/line-height:\s*inherit/);
    expect(headerYearTriggerRule).toMatch(/padding:\s*0/);
  });

  it("renders the top header as a rounded floating surface", () => {
    expect(headerRule).toMatch(/top:\s*0\.75rem/);
    expect(headerRule).toMatch(/margin:\s*0\.75rem\s+0\.75rem\s+0/);
    expect(headerRule).toMatch(/border:\s*1px solid var\(--color-separator\)/);
    expect(headerRule).toMatch(/border-radius:\s*22px/);
    expect(headerRule).toMatch(/box-shadow:/);
    expect(headerRule).toMatch(/background:\s*var\(--color-surface\)/);
    expect(darkHeaderRule).toMatch(/background:\s*var\(--color-surface\)/);
  });

  it("renders the mobile bottom navigation as a rounded floating surface", () => {
    expect(bottomRule).toMatch(/left:\s*0\.75rem/);
    expect(bottomRule).toMatch(/right:\s*0\.75rem/);
    expect(bottomRule).toMatch(/bottom:\s*0\.75rem/);
    expect(bottomRule).toMatch(/border:\s*1px solid var\(--color-separator\)/);
    expect(bottomRule).toMatch(/border-radius:\s*22px/);
    expect(bottomRule).toMatch(/box-shadow:/);
    expect(bottomRule).toMatch(/background:\s*var\(--color-surface\)/);
    expect(appBottomRule).toMatch(/background:\s*var\(--color-surface\)/);
    expect(darkBottomRule).toMatch(/background:\s*var\(--color-surface\)/);
  });

  it("blocks scrolling content behind the rounded shell gutters", () => {
    expect(topBackdropRule).toMatch(/position:\s*fixed/);
    expect(topBackdropRule).toMatch(/background:\s*var\(--color-bg\)/);
    expect(topBackdropRule).toMatch(/z-index:\s*49/);
    expect(bottomBackdropRule).toMatch(/position:\s*fixed/);
    expect(bottomBackdropRule).toMatch(/background:\s*var\(--color-bg\)/);
    expect(bottomBackdropRule).toMatch(/z-index:\s*49/);
  });

  it("centers the command menu against the full viewport instead of the header", () => {
    expect(commandBackdropRule).toMatch(/position:\s*fixed/);
    expect(commandBackdropRule).toMatch(/inset:\s*0/);
    expect(commandBackdropRule).toMatch(/z-index:\s*1000/);
    expect(commandBackdropRule).toMatch(/display:\s*grid/);
    expect(commandBackdropRule).toMatch(/place-items:\s*center/);
    expect(commandBackdropRule).toMatch(/backdrop-filter:\s*blur\(28px\)/);
    expect(commandBackdropRule).toMatch(/-webkit-backdrop-filter:\s*blur\(28px\)/);
    expect(commandBackdropRule).toMatch(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.68\)/);
    expect(commandDialogRule).toMatch(/width:\s*min\(560px,\s*100%\)/);
    expect(commandDialogRule).toMatch(/max-height:\s*calc\(100dvh - 2rem\)/);
    expect(commandDialogRule).toMatch(/overflow-y:\s*auto/);
  });

  it("uses trigger-origin FLIP motion without changing grid centering", () => {
    expect(commandDialogRule).toMatch(/transform-origin:\s*center/);
    expect(commandDialogRule).toMatch(/transition:\s*transform 1080ms/);
    expect(commandDialogRule).toMatch(/backface-visibility:\s*hidden/);
    expect(commandDialogRule).toMatch(/-webkit-backface-visibility:\s*hidden/);
    expect(css).toMatch(/#nav-secondary\.open \.app-command-menu-dialog\s*\{[^}]*opacity:\s*1/);
    expect(commandFlipStartRule).toMatch(/transform:\s*translate\(var\(--nav-secondary-flip-x\),\s*var\(--nav-secondary-flip-y\)\)\s*scale\(var\(--nav-secondary-flip-scale\)\)/);
    expect(commandFlipCloseRule).toMatch(/transition:\s*transform 1200ms/);
    expect(commandFlipCloseRule).toMatch(/opacity:\s*1/);
    expect(css).toMatch(/#nav-secondary\.closing\s*\{[^}]*opacity:\s*0[^}]*transition:\s*opacity 1200ms/);
  });

  it("keeps command groups visually balanced inside the modal", () => {
    expect(commandSegmentRule).toMatch(/display:\s*grid/);
    expect(commandSegmentRule).toMatch(/grid-template-columns:\s*repeat\(2,/);
    expect(commandSegmentRule).toMatch(/padding:\s*0/);
    expect(commandSegmentRule).toMatch(/background:\s*transparent/);
    expect(commandSegmentButtonRule).toMatch(/width:\s*100%/);
    expect(commandSegmentButtonRule).toMatch(/min-width:\s*0/);
    expect(preferenceButtonRule).toMatch(/justify-content:\s*center/);
    expect(preferenceButtonRule).toMatch(/min-height:\s*52px/);
    expect(css).toMatch(/\.app-command-menu-actions \.btn-primary\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
    expect(css).toMatch(/\.app-command-menu-actions \.btn-danger\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  });

  it("compresses long preference labels on narrow mobile screens", () => {
    expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*?\.app-command-menu-content\s*\{[^}]*gap:\s*8px/);
    expect(css).toMatch(/@media \(max-width: 639px\)[\s\S]*?\.app-command-menu-section\s*\{[^}]*padding:\s*10px/);
    expect(css).toMatch(/\.app-command-menu-preferences \.btn-ghost > span\[data-i18n\]\s*\{\s*display:\s*none/);
  });
});
