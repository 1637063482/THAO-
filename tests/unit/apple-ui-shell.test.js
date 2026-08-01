import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/css/app.css", "utf8");
const extractRule = selector => css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] || "";
const headerRule = extractRule("\\.app-header");
const darkHeaderRule = extractRule("\\.dark \\.app-header");
const appBottomRule = extractRule("#bottom-nav\\.app-bottom-nav");
const bottomRule = css.match(/#bottom-nav\s*\{(?=[^}]*left:\s*0\.75rem)([^}]*)\}/)?.[1] || "";
const darkBottomRule = extractRule("\\.dark #bottom-nav");
const topBackdropRule = extractRule("body::before");
const bottomBackdropRule = extractRule("body::after");

describe("Apple UI shell chrome", () => {
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
});
