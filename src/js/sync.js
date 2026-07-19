import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, projectId } from "./firebase.js";
import { state, copyPending, clearPending, mergeBackPending, hasPending } from "./state.js";
import { LEGACY_IMPORT_MAX_BYTES, serializeLegacyImport, validateLegacyImport } from "./import-schema.js";

let unsubscribeSnapshot = null;
let unsubscribePreviousYearSnapshot = null;

function refreshStreakFromSnapshot() {
  if (window.updateStreakAfterRecord) window.updateStreakAfterRecord({ launchDefaultFireworks: false });
  else if (window.renderStreakPanel) window.renderStreakPanel();
}

export function createSyncQueue({
  takeBatch,
  hasPendingChanges,
  restoreBatch,
  writeBatch,
  onStatus,
  debounceMs = 800,
  delayedMs = 3000,
}) {
  let debounceTimer = null;
  let activeWrites = 0;
  let failed = false;

  function refreshStatus() {
    if (activeWrites > 0 || debounceTimer || hasPendingChanges()) onStatus("syncing");
    else onStatus(failed ? "error" : "synced");
  }

  async function flush() {
    debounceTimer = null;
    if (!hasPendingChanges()) {
      refreshStatus();
      return;
    }
    const batch = takeBatch();
    if (!batch) {
      refreshStatus();
      return;
    }
    activeWrites += 1;
    onStatus("syncing");
    const delayedTimer = setTimeout(() => onStatus("delayed"), delayedMs);
    try {
      await writeBatch(batch);
    } catch (error) {
      failed = true;
      restoreBatch(batch);
      onStatus("error");
    } finally {
      clearTimeout(delayedTimer);
      activeWrites -= 1;
      refreshStatus();
    }
  }

  function schedule() {
    failed = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    onStatus("syncing");
    debounceTimer = setTimeout(flush, debounceMs);
  }

  return { schedule, flush };
}

export function updateSyncStatus(status) {
  const el = document.getElementById("sync-status");
  if (!el) return;
  state.isSaving = status === "syncing";
  if (status === "syncing" || status === "delayed") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-600 text-sm font-medium transition-colors border border-yellow-200";
    const label = status === "delayed" ? "同步较慢..." : "同步中...";
    el.innerHTML = '<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span class="hidden sm:inline">' + label + '</span>';
  } else if (status === "synced") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium transition-colors border border-emerald-200";
    el.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span class="hidden sm:inline">已同步</span>';
  } else if (status === "error") {
    el.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-medium transition-colors border border-red-200";
    el.innerHTML = '<span class="hidden sm:inline">网络断开</span>';
  }
}

const cloudQueue = createSyncQueue({
  takeBatch() {
    if (!hasPending()) return null;
    const batch = { year: state.activeYear, updates: copyPending() };
    clearPending();
    return batch;
  },
  hasPendingChanges: hasPending,
  restoreBatch(batch) {
    mergeBackPending(batch.updates);
  },
  async writeBatch(batch) {
    const updatesToSend = batch.updates;
    if (Object.keys(updatesToSend.balances).length === 0) delete updatesToSend.balances;
    if (Object.keys(updatesToSend.entries).length === 0) delete updatesToSend.entries;
    if (Object.keys(updatesToSend.settings).length === 0) delete updatesToSend.settings;
    const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + batch.year);
    await setDoc(docRef, updatesToSend, { merge: true });
  },
  onStatus: updateSyncStatus,
});

export function triggerCloudSave() {
  if (!state.currentUser || !hasPending()) return;
  cloudQueue.schedule();
}

export function setupRealtimeListener() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  if (unsubscribePreviousYearSnapshot) unsubscribePreviousYearSnapshot();
  const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
  const previousDocRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + (state.activeYear - 1));
  unsubscribePreviousYearSnapshot = onSnapshot(previousDocRef, (snapshot) => {
    state.previousYearEntries = snapshot.exists() ? (snapshot.data().entries || {}) : {};
    refreshStreakFromSnapshot();
  }, (error) => {
    console.error("拉取上一年度数据失败:", error);
  });
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
    refreshStreakFromSnapshot();
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
  if (unsubscribePreviousYearSnapshot) { unsubscribePreviousYearSnapshot(); unsubscribePreviousYearSnapshot = null; }
}

function normalizeLegacyLedger(data) {
  return {
    balances: data?.balances || {},
    entries: data?.entries || {},
    settings: data?.settings || {},
  };
}

function recoveryTimestamp(value) {
  return value.replace(/[-:]/g, "").replace(".", "");
}

export async function sha256Hex(serialized, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function downloadRecoveryFile(recovery) {
  const blob = new Blob([recovery.serialized], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = recovery.fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function importLegacyLedgerWithRecovery({
  year,
  importedText,
  confirmOverwrite,
  readCurrentLedger,
  downloadRecovery,
  writeLedger,
  now = () => new Date().toISOString(),
  makeHash = sha256Hex,
}) {
  const importedData = JSON.parse(importedText);
  const validation = validateLegacyImport(importedData, { serializedBytes: new TextEncoder().encode(importedText).length });
  if (!validation.ok) {
    const error = new Error("Legacy import data is invalid");
    error.code = validation.code;
    error.path = validation.path;
    throw error;
  }
  if (!confirmOverwrite()) return { ok: false, reason: "cancelled" };

  const currentLedger = normalizeLegacyLedger(await readCurrentLedger());
  const serialized = serializeLegacyImport(currentLedger);
  const hash = await makeHash(serialized);
  const recovery = {
    year,
    data: currentLedger,
    serialized,
    hash,
    fileName: "my-expense-app-recovery-" + year + "-" + recoveryTimestamp(now()) + "-" + hash + ".json",
  };

  try {
    await downloadRecovery(recovery);
  } catch (error) {
    const backupError = new Error("Import recovery point failed");
    backupError.code = "BACKUP_FAILED";
    backupError.cause = error;
    throw backupError;
  }

  await writeLedger(validation.data);
  return { ok: true, recovery };
}

function readImportFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

async function importDataWithRecovery(file) {
  const importedText = await readImportFileText(file);
  const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
  const result = await importLegacyLedgerWithRecovery({
    year: state.activeYear,
    importedText,
    confirmOverwrite: () => confirm("警告：导入将覆盖当前云端的所有数据，确定要继续吗？"),
    async readCurrentLedger() {
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data() : { balances: {}, entries: {}, settings: {} };
    },
    downloadRecovery: downloadRecoveryFile,
    writeLedger: (data) => setDoc(docRef, data, { merge: false }),
  });
  if (!result.ok) return false;
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) { loadingOverlay.style.display = "flex"; loadingOverlay.style.opacity = "1"; }
  return true;
}

export async function importData(file) {
  if (!file || !state.currentUser) return false;
  if (file.size > LEGACY_IMPORT_MAX_BYTES) {
    const error = new Error("导入文件过大");
    error.code = "FILE_TOO_LARGE";
    throw error;
  }
  return importDataWithRecovery(file);
}
