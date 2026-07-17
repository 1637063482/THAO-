import { describe, it, expect } from "vitest";
import { safeEval } from "../../src/js/utils.js";

describe("smoke", () => {
  it("evaluates a basic expression", () => {
    expect(safeEval("1+2")).toBe(3);
  });
});
