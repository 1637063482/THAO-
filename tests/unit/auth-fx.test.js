import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("../../src/js/fx-display.js", () => ({
  loadCnyVndRate: vi.fn(),
}));

import { initAuth } from "../../src/js/auth.js";
import { loadCnyVndRate } from "../../src/js/fx-display.js";
import { state } from "../../src/js/state.js";

describe("auth FX display integration", () => {
  beforeEach(() => {
    document.body.innerHTML = '<span id="auto-rate-display"></span>';
    state.fxMode = "auto";
    state.fxRateAuto = 3500;
    vi.clearAllMocks();
  });

  it("marks automatic CNY conversion unavailable when live FX and cache are both unavailable", async () => {
    loadCnyVndRate.mockResolvedValue({
      ok: false,
      rate: null,
      source: "unavailable",
      updatedAt: null,
      stale: false,
      message: "(汇率不可用)",
    });

    initAuth(vi.fn(), vi.fn());

    await vi.waitFor(() => {
      expect(document.getElementById("auto-rate-display").innerText).toBe("(汇率不可用)");
    });
    expect(state.fxRateAuto).toBeNull();
  });
});
