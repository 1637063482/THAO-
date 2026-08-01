import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("login interface focus contract", () => {
  it("uses one focus ring on the active auth field instead of the whole field group", () => {
    const css = read("src/css/app.css");

    expect(css).toMatch(/\.auth-field:focus-within\s*\{[\s\S]*?box-shadow:\s*0\s+0\s+0\s+2px\s+rgba\(0,\s*122,\s*255,\s*0\.24\)/);
    expect(css).toMatch(/\.auth-field-group\s*\{[\s\S]*?display:\s*flex[\s\S]*?gap:\s*0\.75rem/);
    expect(css).toMatch(/\.auth-field\s*\{[\s\S]*?border:\s*1px solid var\(--color-separator\)[\s\S]*?border-radius:\s*14px/);
    expect(css).toMatch(/\.auth-field-group:focus-within\s*\{[\s\S]*?box-shadow:\s*none/);
    expect(css).toMatch(/\.auth-field:has\(\.auth-input:not\(:placeholder-shown\)\) \.auth-field-label/);
    expect(css).toMatch(/\.auth-input:focus-visible\s*\{[\s\S]*?box-shadow:\s*none/);
    expect(css).toMatch(/\.auth-password-toggle:focus-visible\s*\{[\s\S]*?box-shadow:\s*none/);
  });

  it("keeps browser autofill inside the rounded auth field and the app surface", () => {
    const css = read("src/css/app.css");

    expect(css).toMatch(/\.auth-field\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.auth-input:-webkit-autofill/);
    expect(css).toMatch(/-webkit-text-fill-color:\s*var\(--color-label\)/);
    expect(css).toMatch(/-webkit-box-shadow:\s*0 0 0 1000px var\(--color-surface-secondary\) inset/);
    expect(css).toMatch(/\.auth-input:autofill/);
  });

  it("keeps the password toggle in the password field container", () => {
    const html = read("index.html");
    expect(html).toMatch(/<div class="auth-field">\s*<label class="auth-field-label"[^>]+for="auth-password"[\s\S]*?<input[^>]+id="auth-password"[\s\S]*?<button[^>]+id="auth-password-toggle"[^>]+role="switch"[^>]+aria-checked="false"/);
  });

  it("keeps the auth overlay opaque so application controls do not show through", () => {
    const css = read("src/css/app.css");
    expect(css).toMatch(/\.overlay-auth\s*\{[\s\S]*?background:\s*var\(--color-bg\)/);
    expect(css).toMatch(/\.dark \.overlay-auth\s*\{[\s\S]*?background:\s*var\(--color-bg\)/);
  });
});
