import { describe, expect, it, vi } from "vitest";
import { loadCnyVndRate } from "../../src/js/fx-display.js";

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => store.has(key) ? store.get(key) : null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    dump: () => Object.fromEntries(store.entries()),
  };
}

function okResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn(async () => data),
  };
}

function httpResponse(status, data = {}) {
  return {
    ok: false,
    status,
    json: vi.fn(async () => data),
  };
}

const cacheKey = "myExpenseApp.fx.cnyVnd";
const now = () => "2026-07-20T04:00:00.000Z";

describe("FX display adapter", () => {
  it("loads a live CNY/VND rate, validates it, and stores a timestamped cache", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () => okResponse({ cny: { vnd: 3612.8 } }));

    await expect(loadCnyVndRate({ fetchImpl, storage, now })).resolves.toEqual({
      ok: true,
      rate: 3612.8,
      source: "live",
      updatedAt: "2026-07-20T04:00:00.000Z",
      stale: false,
      message: "(实时: 3613)",
    });

    expect(JSON.parse(storage.dump()[cacheKey])).toEqual({
      rate: 3612.8,
      updatedAt: "2026-07-20T04:00:00.000Z",
    });
  });

  it("uses the fallback endpoint when the primary FX endpoint fails", async () => {
    const storage = memoryStorage();
    const calls = [];
    const fetchImpl = vi.fn(async url => {
      calls.push(url);
      if (url === "primary") throw new Error("CDN unavailable");
      return okResponse({ cny: { vnd: 3620 } });
    });

    await expect(loadCnyVndRate({ fetchImpl, storage, now, url: "primary", fallbackUrl: "fallback" })).resolves.toMatchObject({
      ok: true,
      rate: 3620,
      source: "live",
    });
    expect(calls).toEqual(["primary", "fallback"]);
  });

  it("times out slow FX requests and uses the last valid cache with age visible", async () => {
    vi.useFakeTimers();
    const storage = memoryStorage({
      [cacheKey]: JSON.stringify({ rate: 3501.2, updatedAt: "2026-07-19T04:00:00.000Z" }),
    });
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const resultPromise = loadCnyVndRate({
      fetchImpl,
      storage,
      now,
      timeoutMs: 1000,
      fallbackUrl: null,
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      rate: 3501.2,
      source: "cache",
      updatedAt: "2026-07-19T04:00:00.000Z",
      stale: false,
      message: "(缓存: 3501)",
    });
    vi.useRealTimers();
  });

  it("uses stale cache for display when HTTP fails, without storing a zero rate", async () => {
    const storage = memoryStorage({
      [cacheKey]: JSON.stringify({ rate: 3499.9, updatedAt: "2026-07-10T04:00:00.000Z" }),
    });
    const fetchImpl = vi.fn(async () => httpResponse(503));

    await expect(loadCnyVndRate({ fetchImpl, storage, now })).resolves.toMatchObject({
      ok: true,
      rate: 3499.9,
      source: "cache",
      updatedAt: "2026-07-10T04:00:00.000Z",
      stale: true,
      message: "(缓存较旧: 3500)",
    });

    expect(storage.setItem).not.toHaveBeenCalledWith(cacheKey, expect.stringContaining('"rate":0'));
  });

  it("rejects malformed JSON rates and reports CNY display unavailable when no cache exists", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () => okResponse({ cny: { vnd: "bad" } }));

    await expect(loadCnyVndRate({ fetchImpl, storage, now })).resolves.toEqual({
      ok: false,
      rate: null,
      source: "unavailable",
      updatedAt: null,
      stale: false,
      message: "(汇率不可用)",
    });

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects cached rates with malformed update timestamps", async () => {
    const storage = memoryStorage({
      [cacheKey]: JSON.stringify({ rate: 3500, updatedAt: "not-a-date" }),
    });
    const fetchImpl = vi.fn(async () => httpResponse(503));

    await expect(loadCnyVndRate({ fetchImpl, storage, now })).resolves.toEqual({
      ok: false,
      rate: null,
      source: "unavailable",
      updatedAt: null,
      stale: false,
      message: "(汇率不可用)",
    });
  });

  it("does not mutate VND ledger state or pending entries when FX is unavailable", async () => {
    const appState = { entries: { "1_1_dining": "1234" } };
    const pendingUpdates = { entries: { "1_2_income": "=5000" } };
    const before = JSON.stringify({ appState, pendingUpdates });
    const fetchImpl = vi.fn(async () => okResponse({ cny: { vnd: 0 } }));

    await loadCnyVndRate({ fetchImpl, storage: memoryStorage(), now });

    expect(JSON.stringify({ appState, pendingUpdates })).toBe(before);
  });
});
