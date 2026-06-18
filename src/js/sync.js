import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, projectId } from "./firebase.js";
import { state, copyPending, clearPending, mergeBackPending, hasPending } from "./state.js";

let syncTimeout = null;
let unsubscribeSnapshot = null;

export function updateSyncStatus(status) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  state.isSaving = status === "syncing";
  if (status === "syncing") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-600 text-sm font-medium transition-colors border border-yellow-200";
    el.innerHTML = '<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span class="hidden sm:inline">同步中...</span>';
  } else if (status === "synced") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium transition-colors border border-emerald-200";
    el.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span class="hidden sm:inline">已同步</span>';
  } else if (status === "error") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-medium transition-colors border border-red-200";
    el.innerHTML = '<span class="hidden sm:inline">网络断开</span>';
  }
}

export function triggerCloudSave() {
  if (!state.currentUser) return;
  if (!hasPending()) return;
  updateSyncStatus("syncing");
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const updatesToSend = copyPending();
    clearPending();
    if (Object.keys(updatesToSend.balances).length === 0) delete updatesToSend.balances;
    if (Object.keys(updatesToSend.entries).length === 0) delete updatesToSend.entries;
    if (Object.keys(updatesToSend.settings).length === 0) delete updatesToSend.settings;
    try {
      const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
      const savePromise = setDoc(docRef, updatesToSend, { merge: true });
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve("timeout"), 3000));
      await Promise.race([savePromise, timeoutPromise]);
      updateSyncStatus("synced");
    } catch (error) {
      console.error("保存失败:", error);
      updateSyncStatus("error");
      mergeBackPending(updatesToSend);
    }
  }, 800);
}

export function setupRealtimeListener() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
  unsubscribeSnapshot = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      state.appState.balances = cloudData.balances || {};
      state.appState.entries = cloudData.entries || {};
      state.appState.settings = cloudData.settings || {};
    } else {
      state.appState.balances = {};
      state.appState.entries = {};
      state.appState.settings = {};
    }
    if (window.softUpdateDOM) window.softUpdateDOM();
    if (window.renderStreakPanel) window.renderStreakPanel();
    updateSyncStatus("synced");
    // 每次快照到达都隐藏 loading（首次加载、超时重登录等场景都需要）
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.opacity = "0";
      setTimeout(() => { loadingOverlay.style.display = "none"; }, 300);
    }
    state.isFirstLoad = false;
  }, (error) => {
    console.error("拉取数据失败:", error);
    updateSyncStatus("error");
  });
}

export function teardownListener() {
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
}

export async function importData(file) {
  if (!file || !state.currentUser) return false;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData && importedData.entries) {
          if (!confirm("警告：导入将覆盖当前云端的所有数据，确定要继续吗？")) return resolve(false);
          const loadingOverlay = document.getElementById("loading-overlay");
          if (loadingOverlay) { loadingOverlay.style.display = "flex"; loadingOverlay.style.opacity = "1"; }
          const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
          await setDoc(docRef, importedData, { merge: false });
          resolve(true);
        }
      } catch (err) { reject(err); }
    };
    reader.readAsText(file);
  });
}