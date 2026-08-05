// ==========================================
// auth.js - Firebase 鉴权系统
// ==========================================
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase.js";
import { loadCnyVndRate } from "./fx-display.js";
import { state, emitAuthChange } from "./state.js";
import { showToast, lsGet, lsSet, lsRemove } from "./utils.js";
import { t } from "./i18n.js";
import { initIcons } from "./icons.js";
import { requestAppConfirmation } from "../components/feedback/confirmation-dialog.js";

const SESSION_KEY = "family_expense_app_last_active";
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
let sessionCheckIntervalId = null;
let loginGuardTimerId = null;
let autoRateRefreshPromise = null;
const authFieldStateBoundInputs = new WeakSet();

function clearLoginGuard() {
  if (loginGuardTimerId !== null) {
    clearTimeout(loginGuardTimerId);
    loginGuardTimerId = null;
  }
}

function recoverLoginUiAfterTimeout() {
  loginGuardTimerId = null;
  if (state.currentUser) return;
  const loadingOverlay = document.getElementById("loading-overlay");
  const authOverlay = document.getElementById("auth-overlay");
  const errEl = document.getElementById("auth-error");
  if (loadingOverlay) loadingOverlay.style.display = "none";
  if (authOverlay) {
    authOverlay.style.display = "flex";
    authOverlay.style.opacity = "1";
  }
  if (errEl) {
    errEl.textContent = t("login_timeout");
    errEl.classList.remove("hidden");
  }
}

export { auth };

/** @param {HTMLInputElement} input */
function syncAuthFieldState(input) {
  const field = input.closest(".auth-field");
  if (!field) return;
  field.classList.toggle("is-filled", input.value.length > 0);
}

/** Keep floating labels correct for initial values and ordinary edits. */
export function bindAuthFieldState() {
  document.querySelectorAll(".auth-field .auth-input").forEach(element => {
    if (!(element instanceof HTMLInputElement)) return;
    syncAuthFieldState(element);
    if (authFieldStateBoundInputs.has(element)) return;
    authFieldStateBoundInputs.add(element);
    const sync = () => syncAuthFieldState(element);
    element.addEventListener("input", sync);
    element.addEventListener("change", sync);
  });
}

bindAuthFieldState();

export function bindAuthPasswordToggle() {
  const toggle = document.getElementById("auth-password-toggle");
  const input = document.getElementById("auth-password");
  if (!toggle || !input) return;
  toggle.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.setAttribute("aria-checked", String(!showing));
    toggle.setAttribute("aria-pressed", String(!showing));
    toggle.setAttribute("aria-label", t(showing ? "show_password" : "hide_password"));
    const icon = toggle.querySelector("[data-icon]");
    if (icon) { icon.dataset.icon = showing ? "eye" : "eyeOff"; initIcons(); }
    input.focus();
  });
}
bindAuthPasswordToggle();

export function initAuth(onLoginCallback, onLogoutCallback) {
  refreshAutoRate();
  checkSessionTimeout();
  sessionCheckIntervalId = setInterval(checkSessionTimeout, 60000);

  onAuthStateChanged(auth, (user) => {
    clearLoginGuard();
    state.currentUser = user;
    emitAuthChange(user);

    const authOverlay = document.getElementById("auth-overlay");
    const loadingOverlay = document.getElementById("loading-overlay");

    if (user) {
      updateActivityTime();
      if (authOverlay) {
        authOverlay.style.opacity = "0";
        setTimeout(() => { authOverlay.style.display = "none"; }, 300);
      }
      onLoginCallback(user);
    } else {
      if (authOverlay) {
        authOverlay.style.display = "flex";
        setTimeout(() => { authOverlay.style.opacity = "1"; }, 10);
      }
      if (loadingOverlay) loadingOverlay.style.display = "none";
      lsRemove(SESSION_KEY);
      onLogoutCallback();
    }
  });
}

export function refreshAutoRate() {
  if (autoRateRefreshPromise) return autoRateRefreshPromise;
  autoRateRefreshPromise = loadCnyVndRate()
    .then(result => {
      state.fxRateAuto = result.ok ? result.rate : null;
      const el = document.getElementById("auto-rate-display");
      if (el) el.innerText = result.message;
      return result;
    })
    .finally(() => { autoRateRefreshPromise = null; });
  return autoRateRefreshPromise;
}

function checkSessionTimeout() {
  if (!state.currentUser) return;
  const saved = lsGet(SESSION_KEY, null);
  if (saved && Date.now() - parseInt(saved, 10) > SESSION_TIMEOUT_MS) {
    performLogout(true);
  }
}

export function updateActivityTime() {
  lsSet(SESSION_KEY, Date.now().toString());
}

export async function handleLogin({ timeoutMs = 15000 } = {}) {
  const email = document.getElementById("auth-email")?.value;
  const pwd = document.getElementById("auth-password")?.value;
  if (!email || !pwd) return;
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) { loadingOverlay.style.display = "flex"; loadingOverlay.style.opacity = "1"; }
  clearLoginGuard();
  loginGuardTimerId = setTimeout(recoverLoginUiAfterTimeout, timeoutMs);
  try {
    await signInWithEmailAndPassword(auth, email, pwd);
    showToast(t("login_success"));
  } catch (e) {
    clearLoginGuard();
    if (loadingOverlay) loadingOverlay.style.display = "none";
    const errEl = document.getElementById("auth-error");
    const credentialError = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(e?.code);
    if (errEl) { errEl.textContent = t(credentialError ? "login_failed" : "login_unavailable"); errEl.classList.remove("hidden"); }
  }
}

export async function performLogout(isTimeout = false) {
  await signOut(auth);
  if (isTimeout) {
    const el = document.getElementById("timeout-msg");
    if (el) el.classList.remove("hidden");
  } else {
    showToast(t("logout_success"));
    setTimeout(() => window.location.reload(), 1000);
  }
}

export async function logoutApp() {
  if (await requestAppConfirmation({ message: t("confirm_logout"), title: t("app_name"), destructive: true })) performLogout(false);
}
