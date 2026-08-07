import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("analytics page shell", () => {
  it("mounts one analytics root and removes the legacy chart surfaces", () => {
    const html = readFileSync("index.html", "utf8");
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const analysisView = parsed.querySelector("#analysis-view");

    expect(analysisView?.querySelector("#analysis-root")).not.toBeNull();
    expect(analysisView?.querySelector("#yearlyChart")).toBeNull();
    expect(analysisView?.querySelector("#monthlyChart")).toBeNull();
    expect(analysisView?.querySelector("#yearly-legend")).toBeNull();
    expect(analysisView?.querySelector("#monthly-legend")).toBeNull();
  });

  it("loads analytics styles with the application entry", () => {
    const main = readFileSync("src/js/main.js", "utf8");
    expect(main).toContain('"../features/analytics/analytics.css"');
  });

  it("refreshes analytics from the same calculation path as the ledger", () => {
    const budget = readFileSync("src/js/budget.js", "utf8");
    const runtime = readFileSync("src/js/application-runtime.js", "utf8");

    expect(budget).toContain("refreshAnalyticsView();");
    expect(runtime).toContain("mountAnalyticsView();");
    expect(runtime).toContain("refreshAnalyticsView();");
  });

  it("stacks narrow-screen summary values instead of squeezing them beside labels", () => {
    const css = readFileSync("src/features/analytics/analytics.css", "utf8");

    expect(css).toContain("flex-direction: column;");
    expect(css).toContain(".analytics-budget-summary > div:last-child");
    expect(css).toContain("grid-column: 1 / -1;");
  });
});
