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
import { handleLogin } from "../../src/js/auth.js";
import { loadCnyVndRate } from "../../src/js/fx-display.js";
import { state } from "../../src/js/state.js";
import { signInWithEmailAndPassword } from "firebase/auth";

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

  it("recovers the login UI when Firebase Auth never settles", async () => {
    vi.useFakeTimers();
    document.documentElement.lang = "vi";
    document.body.innerHTML = `
      <div id="auth-overlay" style="display:none;opacity:0"></div>
      <div id="loading-overlay" style="display:flex;opacity:1"></div>
      <div id="auth-error" class="hidden"></div>
      <input id="auth-email" value="fixture@example.invalid">
      <input id="auth-password" value="fixture-password">
    `;
    state.currentUser = null;
    signInWithEmailAndPassword.mockReturnValue(new Promise(() => {}));

    void handleLogin({ timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(document.getElementById("loading-overlay").style.display).toBe("none");
    expect(document.getElementById("auth-overlay").style.display).toBe("flex");
    expect(document.getElementById("auth-error").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("auth-error").textContent).toContain("Đăng nhập mất quá nhiều thời gian");
    vi.useRealTimers();
  });
});
