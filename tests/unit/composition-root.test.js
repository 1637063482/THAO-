import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("main composition root", () => {
  it("delegates application behavior to the application runtime", () => {
    const source = readFileSync("src/js/main.js", "utf8");

    expect(source).toContain('import { startApplication } from "./application-runtime.js"');
    expect(source).toContain("startApplication();");
    expect(source).not.toContain("function switchLanguage");
    expect(source).not.toContain("function switchCurrency");
    expect(source).not.toContain("function toggleDarkMode");
    expect(source).not.toContain("function exportToCSV");
  });
});
