import { describe, expect, it } from "vitest";
import {
  DEPRECATED_MODULES,
  assertNoDeprecatedProductionImports,
  collectProductionImportGraph,
} from "../../scripts/check-production-imports.mjs";

describe("production import graph", () => {
  it("does not reach the abandoned account and transaction architecture", async () => {
    const graph = await collectProductionImportGraph();

    expect(graph).not.toEqual(expect.arrayContaining(DEPRECATED_MODULES));
    await expect(assertNoDeprecatedProductionImports()).resolves.toBeUndefined();
  });
});
