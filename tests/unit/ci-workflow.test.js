import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readText(path) {
  return readFileSync(path, "utf8");
}

describe("CI gate workflow", () => {
  it("runs install, test, typecheck, Firestore Rules tests, and build without deployment", () => {
    const workflow = readText(".github/workflows/ci.yml");
    const pkg = JSON.parse(readText("package.json"));

    expect(workflow).toContain("actions/checkout@v4");
    expect(workflow).toContain("actions/setup-node@v4");
    expect(workflow).toContain("actions/setup-java@v4");
    expect(workflow).toMatch(/node-version:\s*["']?22/);
    expect(workflow).toMatch(/distribution:\s*["']?temurin/);
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm test -- --run");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run typecheck:js");
    expect(workflow).toContain("npm run test:rules");
    expect(workflow).toContain("npm run build");
    expect(pkg.scripts["test:rules"]).toContain("--project demo-no-project");
    expect(workflow).not.toContain("continue-on-error");
    expect(workflow).not.toMatch(/\bfirebase\s+deploy\b/);
    expect(workflow).not.toContain("FIREBASE_TOKEN");
    expect(workflow).not.toContain("secrets.");
  });

  it("documents that CI must not contain production secrets, real UID/email values, or financial data", () => {
    const security = readText("SECURITY.md");
    const workflow = readText(".github/workflows/ci.yml");
    const combined = `${security}\n${workflow}`;

    expect(security).toContain("Do not commit production Firebase credentials");
    expect(security).toContain("Do not commit real user UID or email allowlists");
    expect(security).toContain("Do not commit real ledger or financial data");
    expect(combined).not.toMatch(/[0-9]{10}@qq\.com/i);
    expect(combined).not.toMatch(/uid_[a-z0-9_-]{8,}/i);
  });
});
