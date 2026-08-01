import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("Apple UI visual fixtures", () => {
  it("loads the production settlement stylesheet and behavior entry", () => {
    const fixture = read("tests/fixtures/uxs014-settlement.html");
    expect(fixture).toContain('<link rel="stylesheet" href="/src/css/app.css">');
    expect(fixture).toContain('<link rel="stylesheet" href="/src/features/deposits/deposits.css">');
    expect(fixture).toContain("bindDepositSettlementForm");
    expect(fixture).toContain("confirm: () => true");
  });
});
