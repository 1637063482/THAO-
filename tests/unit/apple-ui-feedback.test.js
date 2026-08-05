import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const appCss = readFileSync("src/css/app.css", "utf8");
const depositCss = readFileSync("src/features/deposits/deposits.css", "utf8");

describe("Apple UI feedback system", () => {
  it("uses semantic feedback states for toast, overlays, loading, and deposit sync", () => {
    expect(appCss).toContain('#toast[data-state="error"]');
    expect(appCss).toContain(".overlay-loading");
    expect(appCss).toContain("var(--color-primary)");
    expect(depositCss).toContain(".deposit-state-loading, .deposit-state-syncing");
    expect(depositCss).toContain("var(--color-danger)");
  });

  it("gives quick add and confirmations an app-owned surface rather than a browser prompt", () => {
    expect(appCss).toContain("#quick-add-panel");
    expect(appCss).toContain(".app-global-modal");
    expect(appCss).toContain(".app-global-modal-dialog");
    expect(appCss).toContain(".app-confirmation-dialog");
    expect(appCss).toContain("env(safe-area-inset-bottom)");
  });

  it("keeps body-portaled dropdown menus above global entry modals", () => {
    expect(appCss).toContain(".app-dropdown-menu-portal");
    expect(appCss).toContain("z-index: 1200");
  });
});
