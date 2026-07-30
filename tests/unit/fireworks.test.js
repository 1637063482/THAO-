import { describe, expect, it } from "vitest";
import * as fireworks from "../../src/js/fireworks.js";

describe("fireworks timing", () => {
  it("reduces barrage travel speed by 20% when show duration increases by 25%", () => {
    expect(fireworks.calculateBarrageSpeed).toBeTypeOf("function");
    const previousSpeed = fireworks.calculateBarrageSpeed(390, 6000, 1);
    const extendedSpeed = fireworks.calculateBarrageSpeed(390, 7500, 1);

    expect(extendedSpeed / previousSpeed).toBeCloseTo(0.8, 8);
  });
});
