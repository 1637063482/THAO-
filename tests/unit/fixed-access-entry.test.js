import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fixed two-user access entry", () => {
  it("does not expose self-service Firebase account registration", () => {
    const html = readFileSync("index.html", "utf8");
    const authSource = readFileSync("src/js/auth.js", "utf8");
    const mainSource = readFileSync("src/js/main.js", "utf8");

    expect(html).not.toContain("handleRegister");
    expect(html).not.toContain("注册新账号");
    expect(authSource).not.toContain("createUserWithEmailAndPassword");
    expect(authSource).not.toContain("handleRegister");
    expect(mainSource).not.toContain("handleRegister");
  });
});
