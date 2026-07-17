import { describe, expect, it, vi } from "vitest";
import { createSyncQueue } from "../../src/js/sync.js";
import { mergeBackPending, state } from "../../src/js/state.js";

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
});
