import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("Apple UI foundation", () => {
  it("uses platform typography without external display fonts", () => {
    const html = read("index.html");
    const css = read("src/css/app.css");
    const tailwind = read("tailwind.config.js");

    expect(html).not.toContain("fonts.googleapis.com");
    expect(css).toContain("--font-sans: -apple-system");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(tailwind).toContain("'-apple-system'");
  });

  it("defines semantic Apple-style surface and action tokens", () => {
    const css = read("src/css/app.css");

    expect(css).toContain("--color-primary: #007aff");
    expect(css).toContain("--color-bg: #f2f2f7");
    expect(css).toContain("--color-surface: #ffffff");
    expect(css).toContain("--color-danger: #ff3b30");
    expect(css).toContain("--color-success: #34c759");
  });

  it("uses flat action and page surfaces instead of global gradients", () => {
    const css = read("src/css/app.css");
    const bodyRule = css.match(/body\s*\{([\s\S]*?)\n\}/)?.[1] || "";
    const primaryRule = css.match(/\.btn-primary\s*\{([\s\S]*?)\n\}/)?.[1] || "";

    expect(bodyRule).not.toContain("linear-gradient");
    expect(primaryRule).not.toContain("linear-gradient");
  });
});
