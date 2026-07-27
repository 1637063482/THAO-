import { describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({ next: null, error: null }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((...parts) => parts.join("/")),
  onSnapshot: vi.fn((_reference, next, error) => { firestore.next = next; firestore.error = error; return vi.fn(); }),
}));

import { subscribeToDeposits } from "../../src/features/deposits/sync.js";

describe("deposit snapshot metadata", () => {
  it("passes Firestore fromCache state to the UI lifecycle callback", () => {
    const onChange = vi.fn();
    subscribeToDeposits({}, "fixture-project", { onChange });
    firestore.next({ exists: () => false, metadata: { fromCache: true } });
    expect(onChange).toHaveBeenCalledWith(
      { schemaVersion: 1, depositsById: {}, acknowledgementsByKey: {}, lastMutation: null },
      { fromCache: true },
    );
  });
});
