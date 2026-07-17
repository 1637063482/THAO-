import { describe, expect, it } from "vitest";
import { safeEval } from "../../src/js/utils.js";

describe("safeEval legacy characterization", () => {
  it.each([
    [undefined, 0],
    [null, 0],
    ["", 0],
    ["0", 0],
    ["=", 0],
    ["=1+2*3", 7],
    ["(2+3)*4", 20],
    ["1e3", 1000],
    ["1/0", 0],
    ["1++2", 1],
    ["1+", 1],
    ["100abc", 100],
    ["-5", -5],
    ["2**3", 2],
    ["not-a-number", 0],
    ["9 / 3", 3],
    ["0.1+0.2", 0.30000000000000004],
    [".".repeat(201), 0],
  ])("documents input %j as %s", (input, expected) => {
    expect(safeEval(input)).toBe(expected);
  });
});
