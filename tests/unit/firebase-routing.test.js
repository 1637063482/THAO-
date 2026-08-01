import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("local Firebase routing", () => {
  it("keeps localhost login on the configured Firebase Auth service", () => {
    const source = readFileSync("src/js/firebase.js", "utf8");

    expect(source).toContain("connectFirestoreEmulator");
    expect(source).not.toContain("connectAuthEmulator");
  });
});
