// ==========================================
// auth.js - Firebase 鉴权系统
// ==========================================
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { app } from "./firebase.js";
import { getLedgerToday } from "./clock.js";
import { loadCnyVndRate } from "./fx-display.js";
import { state, emitAuthChange } from "./state.js";
import { showToast, lsGet, lsSet, lsRemove } from "./utils.js";
import { t } from "./i18n.js";

const auth = getAuth(app);

const SESSION_KEY = "family_expense_app_last_active";
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
let sessionCheckIntervalId = null;

export { auth };

export function initAuth(onLoginCallback, onLogoutCallback) {
  initDOM();
  fetchReliableAutoRate();
  checkSessionTimeout();
  sessionCheckIntervalId = setInterval(checkSessionTimeout, 60000);

  onAuthStateChanged(auth, (user) => {
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

function initDOM() {
  const tabsContainer = document.getElementById("month-tabs");
  if (!tabsContainer) return;
  for (let i = 1; i <= 12; i++) {
    tabsContainer.innerHTML += '<button id="btn-tab-' + i + '" onclick="window.switchMonthTab(' + i + ')" class="month-tab">' + t("month_tab", { month: i }) + '</button>';
  }
  setTimeout(() => {
    if (window.switchMonthTab) {
      const today = getLedgerToday();
      window.switchMonthTab(state.activeYear === today.year ? today.month : 1);
    }
  }, 100);
}

async function fetchReliableAutoRate() {
  const result = await loadCnyVndRate();
  state.fxRateAuto = result.ok ? result.rate : null;
  const el = document.getElementById("auto-rate-display");
  if (el) el.innerText = result.message;
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

export async function handleLogin() {
  const email = document.getElementById("auth-email")?.value;
  const pwd = document.getElementById("auth-password")?.value;
  if (!email || !pwd) return;
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) { loadingOverlay.style.display = "flex"; loadingOverlay.style.opacity = "1"; }
  try {
    await signInWithEmailAndPassword(auth, email, pwd);
    showToast(t("login_success"));
  } catch (e) {
    if (loadingOverlay) loadingOverlay.style.display = "none";
    const errEl = document.getElementById("auth-error");
    if (errEl) { errEl.innerText = t("login_failed"); errEl.classList.remove("hidden"); }
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

export function logoutApp() {
  if (confirm(t("confirm_logout"))) performLogout(false);
}
