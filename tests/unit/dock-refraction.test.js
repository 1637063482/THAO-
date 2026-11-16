import { describe, expect, it } from "vitest";
import { createDisplacementPixels } from "../../src/js/dock-refraction.js";

describe("dock refraction displacement map", () => {
  it("is neutral at the center and symmetric across the capsule", () => {
    const width = 81;
    const height = 41;
    const pixels = createDisplacementPixels(width, height);
    const channel = (x, y, index) => pixels[(y * width + x) * 4 + index];

    expect(channel(40, 20, 0)).toBe(128);
    expect(channel(40, 20, 1)).toBe(128);
    for (const y of [0, 10, 20, 30, 40]) {
      for (let x = 0; x < width / 2; x += 1) {
        expect(channel(x, y, 0) + channel(width - x - 1, y, 0)).toBe(256);
        expect(channel(x, y, 1)).toBe(channel(width - x - 1, y, 1));
      }
    }
    expect(channel(40, 0, 1) + channel(40, height - 1, 1)).toBe(256);
    expect(Math.abs(channel(40, 0, 1) - 128)).toBeGreaterThan(20);
    expect([...pixels].every((value) => value >= 0 && value <= 255)).toBe(true);
  });
});
