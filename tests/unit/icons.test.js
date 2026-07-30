import { describe, expect, it } from "vitest";
import { Icons } from "../../src/js/icons.js";

describe("icons", () => {
  it("renders savings as a recognizable piggy bank within the icon canvas", () => {
    const svg = Icons.piggyBank("w-5 h-5");

    expect(svg).toContain('<circle cx="11" cy="3" r="1.5"/>');
    expect(svg).toContain('<path d="M10 9h4"/>');
    expect(svg).toContain('<path d="M6 18v3"/>');
    expect(svg).not.toContain("H25");
  });
});
