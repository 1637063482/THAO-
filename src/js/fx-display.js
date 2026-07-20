export const FX_CACHE_KEY = "myExpenseApp.fx.cnyVnd";
export const FX_RATE_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json";

const DEFAULT_TIMEOUT_MS = 2500;
const STALE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

async function withTimeout(promise, ms) {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("FX_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

function validRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function readCache(storage, timestamp) {
  try {
    const raw = storage?.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!validRate(cached.rate) || typeof cached.updatedAt !== "string") return null;
    const age = Date.parse(timestamp) - Date.parse(cached.updatedAt);
    return {
      rate: cached.rate,
      updatedAt: cached.updatedAt,
      stale: Number.isFinite(age) && age > STALE_CACHE_MS,
    };
  } catch {
    return null;
  }
}

function writeCache(storage, rate, updatedAt) {
  try {
    storage?.setItem(FX_CACHE_KEY, JSON.stringify({ rate, updatedAt }));
  } catch {
    // Cache write failure must not block VND accounting.
  }
}

function messageFor(result) {
  if (result.source === "live") return "(实时: " + Math.round(result.rate) + ")";
  if (result.source === "cache") return (result.stale ? "(缓存较旧: " : "(缓存: ") + Math.round(result.rate) + ")";
  return "(汇率不可用)";
}

export async function loadCnyVndRate({
  fetchImpl = globalThis.fetch,
  storage = globalThis.localStorage,
  now = () => new Date().toISOString(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  url = FX_RATE_URL,
} = {}) {
  const timestamp = now();
  try {
    if (typeof fetchImpl !== "function") throw new Error("FX_FETCH_UNAVAILABLE");
    const response = await withTimeout(fetchImpl(url), timeoutMs);
    if (!response?.ok) throw new Error("FX_HTTP_" + (response?.status || "UNKNOWN"));
    const data = await response.json();
    const rate = data?.cny?.vnd;
    if (!validRate(rate)) throw new Error("FX_INVALID_RATE");
    writeCache(storage, rate, timestamp);
    const result = { ok: true, rate, source: "live", updatedAt: timestamp, stale: false };
    return { ...result, message: messageFor(result) };
  } catch {
    const cached = readCache(storage, timestamp);
    if (cached) {
      const result = { ok: true, source: "cache", ...cached };
      return { ...result, message: messageFor(result) };
    }
    const result = { ok: false, rate: null, source: "unavailable", updatedAt: null, stale: false };
    return { ...result, message: messageFor(result) };
  }
}
