import { describe, expect, it, vi } from "vitest";
const firestoreMock = vi.hoisted(() => ({
  snapshotHandler: null,
  snapshotErrorHandler: null,
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((...parts) => parts.join("/")),
  getFirestore: vi.fn(() => ({})),
  setDoc: vi.fn(),
  onSnapshot: vi.fn((ref, onNext, onError) => {
    firestoreMock.snapshotHandler = onNext;
    firestoreMock.snapshotErrorHandler = onError;
    return vi.fn();
  }),
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

vi.mock("../../src/js/fireworks.js", () => ({
  Fireworks: { launch: vi.fn() },
}));

vi.mock("../../src/js/icons.js", () => ({
  Icons: {
    flame: () => "",
    check: () => "",
  },
  initIcons: vi.fn(),
}));

import { createSyncQueue, setupRealtimeListener, teardownListener } from "../../src/js/sync.js";
import { mergeBackPending, state } from "../../src/js/state.js";
import { Fireworks } from "../../src/js/fireworks.js";
import { updateStreakAfterRecord } from "../../src/js/render.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function harness() {
  const pending = [];
  const restored = [];
  const writes = [];
  const statuses = [];
  const queue = createSyncQueue({
    takeBatch: () => pending.shift(),
    hasPendingChanges: () => pending.length > 0,
    restoreBatch: (batch) => restored.push(batch),
    writeBatch: (batch) => {
      const d = deferred();
      writes.push({ batch, ...d });
      return d.promise;
    },
    onStatus: (status) => statuses.push(status),
    debounceMs: 800,
    delayedMs: 3000,
  });
  return { pending, restored, writes, statuses, queue };
}

function vietnamDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function keyForDate(dateStr) {
  const [, month, day] = dateStr.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return `${Number(month)}_${Number(day)}_dining`;
}

function entriesForStreak(length, today = new Date()) {
  const entries = {};
  const todayStr = vietnamDateString(today);
  const todayMs = Date.UTC(Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7)) - 1, Number(todayStr.slice(8, 10)), 12);
  for (let offset = 0; offset < length; offset += 1) {
    entries[keyForDate(vietnamDateString(new Date(todayMs - offset * 86400000)))] = "100000";
  }
  return entries;
}

describe("sync queue", () => {
  it("does not overwrite a newer pending edit when restoring a failed batch", () => {
    state.pendingUpdates = { balances: {}, entries: { same: "new" }, settings: {} };
    mergeBackPending({ balances: {}, entries: { same: "old", missing: "restored" }, settings: {} });
    expect(state.pendingUpdates.entries).toEqual({ same: "new", missing: "restored" });
  });

  it("does not report synced when a write exceeds the delay threshold", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.pending.push({ value: 1 });
    h.queue.schedule();
    await vi.advanceTimersByTimeAsync(800);
    expect(h.writes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(h.statuses.at(-1)).toBe("delayed");
    expect(h.statuses).not.toContain("synced");
    h.writes[0].resolve();
    await vi.runAllTimersAsync();
    expect(h.statuses.at(-1)).toBe("synced");
    vi.useRealTimers();
  });

  it("restores a rejected batch and reports error", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.pending.push({ value: 1 });
    h.queue.schedule();
    await vi.advanceTimersByTimeAsync(800);
    h.writes[0].reject(new Error("offline"));
    await vi.runAllTimersAsync();
    expect(h.restored).toEqual([{ value: 1 }]);
    expect(h.statuses.at(-1)).toBe("error");
    vi.useRealTimers();
  });

  it("waits for both in-flight batches before reporting synced", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.pending.push({ value: 1 });
    h.queue.schedule();
    await vi.advanceTimersByTimeAsync(800);
    h.pending.push({ value: 2 });
    h.queue.schedule();
    await vi.advanceTimersByTimeAsync(800);
    expect(h.writes).toHaveLength(2);
    h.writes[0].resolve();
    await Promise.resolve();
    expect(h.statuses.at(-1)).toBe("syncing");
    h.writes[1].resolve();
    await vi.runAllTimersAsync();
    expect(h.statuses.at(-1)).toBe("synced");
    vi.useRealTimers();
  });

  it("routes remote snapshots through the streak milestone refresh path", () => {
    document.body.innerHTML = '<div id="sync-status"></div>';
    state.activeYear = 2026;
    state.appState = { balances: {}, entries: {}, settings: {} };
    state.previousYearEntries = {};
    const onSnapshotApplied = vi.fn();
    const onStreakRefresh = vi.fn();

    setupRealtimeListener({ onSnapshotApplied, onStreakRefresh });
    firestoreMock.snapshotHandler({
      exists: () => true,
      data: () => ({
        balances: {},
        entries: { "3_31_dining": "100000" },
        settings: {},
      }),
    });

    expect(state.appState.entries).toEqual({ "3_31_dining": "100000" });
    expect(onSnapshotApplied).toHaveBeenCalledTimes(1);
    expect(onStreakRefresh).toHaveBeenCalledTimes(1);
  });

  it("releases the initial loading overlay when the current ledger snapshot fails", async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    document.body.innerHTML = '<div id="loading-overlay" style="display:flex;opacity:1"></div><div id="sync-status"></div>';
    state.activeYear = 2026;
    state.isFirstLoad = true;

    setupRealtimeListener();
    firestoreMock.snapshotErrorHandler(new Error("permission denied"));

    expect(document.getElementById("loading-overlay").style.opacity).toBe("0");
    expect(state.isFirstLoad).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(document.getElementById("loading-overlay").style.display).toBe("none");
    expect(document.getElementById("sync-status").className).toContain("sync-status-error");

    consoleError.mockRestore();
    vi.useRealTimers();
  });

  it("releases the initial loading overlay when snapshot rendering throws", async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    document.body.innerHTML = '<div id="loading-overlay" style="display:flex;opacity:1"></div><div id="sync-status"></div>';
    state.activeYear = 2026;
    state.isFirstLoad = true;

    setupRealtimeListener({ onSnapshotApplied: () => { throw new Error("render failed"); } });
    expect(() => firestoreMock.snapshotHandler({
      exists: () => true,
      data: () => ({ balances: {}, entries: { "7_1_dining": "100/3" }, settings: {} }),
    })).not.toThrow();

    expect(document.getElementById("loading-overlay").style.opacity).toBe("0");
    expect(state.isFirstLoad).toBe(false);
    expect(document.getElementById("sync-status").className).toContain("sync-status-error");
    await vi.advanceTimersByTimeAsync(300);
    expect(document.getElementById("loading-overlay").style.display).toBe("none");

    consoleError.mockRestore();
    vi.useRealTimers();
  });

  it("releases the loading overlay when the initial ledger listener never settles", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="loading-overlay" style="display:flex;opacity:1"></div><div id="sync-status"></div>';
    state.activeYear = 2026;
    state.isFirstLoad = true;

    setupRealtimeListener({ initialLoadTimeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(document.getElementById("loading-overlay").style.opacity).toBe("0");
    expect(state.isFirstLoad).toBe(false);
    expect(document.getElementById("sync-status").className).toContain("sync-status-error");
    await vi.advanceTimersByTimeAsync(300);
    expect(document.getElementById("loading-overlay").style.display).toBe("none");
    teardownListener();
    vi.useRealTimers();
  });

  it.each([7, 30])("triggers the %i day milestone once from remote snapshots", async (days) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T05:00:00.000Z"));
    document.body.innerHTML = '<div id="sync-status"></div><section id="streak-panel"></section>';
    localStorage.clear();
    state.activeYear = 2026;
    state.activeMonthId = 3;
    state.appState = { balances: {}, entries: {}, settings: {} };
    state.previousYearEntries = {};
    Fireworks.launch.mockClear();

    setupRealtimeListener({
      onSnapshotApplied: vi.fn(),
      onStreakRefresh: () => updateStreakAfterRecord({ launchDefaultFireworks: false }),
    });
    const snapshot = {
      exists: () => true,
      data: () => ({
        balances: {},
        entries: entriesForStreak(days),
        settings: {},
      }),
    };
    firestoreMock.snapshotHandler(snapshot);
    firestoreMock.snapshotHandler(snapshot);
    await vi.dynamicImportSettled();

    const milestoneCalls = Fireworks.launch.mock.calls.filter(([opts]) => opts?.duration === 15000);
    expect(milestoneCalls).toHaveLength(1);
    expect(Fireworks.launch.mock.calls.filter(([opts]) => opts?.duration === 7500)).toHaveLength(0);
    vi.useRealTimers();
  });
});
