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
import { state, emitAuthChange } from "./state.js";
import { showToast, lsGet, lsSet, lsRemove } from "./utils.js";

const auth = getAuth(app);

const SESSION_KEY = "family_expense_app_last_active";
const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
let sessionCheckIntervalId = null;

export { auth };

export function initAuth(onLoginCallback, onLogoutCallback) {
  initDOM();
  fetchAutoRate();
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
    tabsContainer.innerHTML += '<button id="btn-tab-' + i + '" onclick="window.switchMonthTab(' + i + ')" class="month-tab">' + i + '月</button>';
  }
  setTimeout(() => {
    if (window.switchMonthTab) {
      const today = getLedgerToday();
      window.switchMonthTab(state.activeYear === today.year ? today.month : 1);
    }
  }, 100);
}

async function fetchAutoRate() {
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json");
    const data = await res.json();
    if (data && data.cny && data.cny.vnd) {
      state.fxRateAuto = data.cny.vnd;
      const el = document.getElementById("auto-rate-display");
      if (el) el.innerText = "(实时: " + Math.round(state.fxRateAuto) + ")";
    }
  } catch {
    const el = document.getElementById("auto-rate-display");
    if (el) el.innerText = "(API连接失败)";
  }
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
    showToast("登录成功");
  } catch (e) {
    if (loadingOverlay) loadingOverlay.style.display = "none";
    const errEl = document.getElementById("auth-error");
    if (errEl) { errEl.innerText = "登录失败: 账号或密码错误"; errEl.classList.remove("hidden"); }
  }
}

export async function performLogout(isTimeout = false) {
  await signOut(auth);
  if (isTimeout) {
    const el = document.getElementById("timeout-msg");
    if (el) el.classList.remove("hidden");
  } else {
    showToast("已安全退出");
    setTimeout(() => window.location.reload(), 1000);
  }
}

export function logoutApp() {
  if (confirm("确定要退出账号吗？")) performLogout(false);
}
