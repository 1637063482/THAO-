import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");

describe("PWA acceptance shell", () => {
  it("keeps root and Vite public PWA artifacts identical", () => {
    expect(read("manifest.json")).toBe(read("public/manifest.json"));
    expect(read("sw.js")).toBe(read("public/sw.js"));
  });

  it.each([["manifest.json"], ["public/manifest.json"]])("keeps %s aligned with the vi/VND private product", path => {
    const manifest = JSON.parse(read(path));
    expect(manifest).toMatchObject({ name: "Sổ thu chi của Thao", short_name: "Sổ của Thao", lang: "vi", id: "/", start_url: "/", scope: "/", display: "standalone" });
    expect(manifest.name).not.toMatch(/2026|家庭|协同/i);
    expect(manifest.icons.map(icon => icon.src)).toEqual(expect.arrayContaining(["/app-icon-192.png", "/app-icon-512.png"]));
    expect(manifest.icons.some(icon => icon.purpose === "maskable")).toBe(true);
  });

  it.each([["sw.js"], ["public/sw.js"]])("requires explicit update consent and a navigation fallback in %s", path => {
    const source = read(path);
    const installBody = source.slice(source.indexOf("addEventListener('install'"), source.indexOf("addEventListener('message'"));
    expect(installBody).not.toContain("skipWaiting");
    expect(source).toContain("action === 'skipWaiting'");
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toContain("cache.match('/index.html')");
    expect(source).toContain("response.ok");
  });

  it("hands a waiting worker control before reloading and exposes an accessible update status", () => {
    const html = read("index.html");
    expect(html).toContain('id="update-toast"');
    expect(html).toMatch(/id="update-toast"[^>]+role="status"[^>]+aria-live="polite"/);
    expect(html).toContain("registration.waiting.postMessage({ action: 'skipWaiting' })");
    expect(html).toContain("navigator.serviceWorker.addEventListener('controllerchange'");
    expect(html).not.toContain("window.location.reload(true)");
  });

  it("declares viewport-fit cover and install metadata for mobile safe areas", () => {
    const html = read("index.html");
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="Sổ của Thao"');
  });

  it.each([["public/app-icon-192.png", 192], ["public/app-icon-512.png", 512]])("ships a square PNG at %s", (path, size) => {
    const bytes = readFileSync(path);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(bytes.readUInt32BE(16)).toBe(size); expect(bytes.readUInt32BE(20)).toBe(size);
  });
});
