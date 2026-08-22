import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, projectId } from "./firebase.js";
import { state, copyPending, copyPendingSettingsBases, clearPending, mergeBackPending, hasPending } from "./state.js";
import { reconcileSettingsSnapshot } from "../domain/ledger-conflicts.js";
import { LEGACY_IMPORT_MAX_BYTES, serializeLegacyImport, validateLegacyImport } from "./import-schema.js";
import { t } from "./i18n.js";
import { requestAppConfirmation } from "../components/feedback/confirmation-dialog.js";

let unsubscribeSnapshot = null;
let unsubscribePreviousYearSnapshot = null;
let initialLedgerLoadTimerId = null;
const IMPORT_RECOVERY_STORAGE_PREFIX = "myExpenseApp.importRecovery.";
const inFlightLedgerBatches = [];

function refreshStreakFromSnapshot(onStreakRefresh) {
  onStreakRefresh();
}

function completeInitialLedgerLoad() {
  if (initialLedgerLoadTimerId !== null) {
    clearTimeout(initialLedgerLoadTimerId);
    initialLedgerLoadTimerId = null;
  }
  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.style.opacity = "0";
    setTimeout(() => { loadingOverlay.style.display = "none"; }, 300);
  }
  state.isFirstLoad = false;
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
  const waiters = [];

  function settleWaiters(batchWaiters, result, error) {
    batchWaiters.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(result);
    });
  }

  function refreshStatus() {
    if (activeWrites > 0 || debounceTimer) onStatus("syncing");
    else if (failed) onStatus("error");
    else if (hasPendingChanges()) onStatus("syncing");
    else onStatus("synced");
  }

  async function flush() {
    debounceTimer = null;
    const batchWaiters = waiters.splice(0);
    if (!hasPendingChanges()) {
      refreshStatus();
      settleWaiters(batchWaiters, { ok: false, reason: "no-pending" });
      return { ok: false, reason: "no-pending" };
    }
    const batch = takeBatch();
    if (!batch) {
      refreshStatus();
      settleWaiters(batchWaiters, { ok: false, reason: "no-batch" });
      return { ok: false, reason: "no-batch" };
    }
    activeWrites += 1;
    onStatus("syncing");
    const delayedTimer = setTimeout(() => onStatus("delayed"), delayedMs);
    try {
      await writeBatch(batch);
      const result = { ok: true, batch };
      settleWaiters(batchWaiters, result);
      return result;
    } catch (error) {
      failed = true;
      restoreBatch(batch);
      onStatus("error");
      settleWaiters(batchWaiters, null, error);
      throw error;
    } finally {
      clearTimeout(delayedTimer);
      activeWrites -= 1;
      refreshStatus();
    }
  }

  function schedule() {
    if (!hasPendingChanges()) return Promise.resolve({ ok: false, reason: "no-pending" });
    failed = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    onStatus("syncing");
    const promise = new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    promise.catch(() => {});
    debounceTimer = setTimeout(() => { void flush().catch(() => {}); }, debounceMs);
    return promise;
  }

  return { schedule, flush };
}

export function updateSyncStatus(status) {
  state.isSaving = status === "syncing" || status === "delayed";
  const el = document.getElementById("sync-status");
  if (!el) return;
  if (status === "syncing" || status === "delayed") {
    el.className = "app-sync-status sync-status-saving";
    const label = status === "delayed" ? t("saving") : t("saving");
    el.innerHTML = '<svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span class="hidden sm:inline">' + label + '</span>';
  } else if (status === "synced") {
    el.className = "app-sync-status sync-status-synced";
    el.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span class="hidden sm:inline">' + t("synced") + '</span>';
  } else if (status === "error") {
    el.className = "app-sync-status sync-status-error";
    el.innerHTML = '<span class="hidden sm:inline">' + t("offline") + '</span>';
  }
}

const cloudQueue = createSyncQueue({
  takeBatch() {
    if (!hasPending()) return null;
    const batch = { year: state.activeYear, updates: copyPending(), settingsBases: copyPendingSettingsBases() };
    clearPending();
    inFlightLedgerBatches.push(batch);
    return batch;
  },
  hasPendingChanges: hasPending,
  restoreBatch(batch) {
    removeInFlightBatch(batch);
    mergeBackPending(batch.updates, batch.settingsBases);
  },
  async writeBatch(batch) {
    const updatesToSend = {};
    if (Object.keys(batch.updates.balances).length > 0) updatesToSend.balances = batch.updates.balances;
    if (Object.keys(batch.updates.entries).length > 0) updatesToSend.entries = batch.updates.entries;
    if (Object.keys(batch.updates.settings).length > 0) updatesToSend.settings = batch.updates.settings;
    if (Object.keys(batch.updates.operationsById || {}).length > 0) updatesToSend.operationsById = batch.updates.operationsById;
    const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + batch.year);
    try {
      await setDoc(docRef, updatesToSend, { merge: true });
    } finally {
      removeInFlightBatch(batch);
    }
  },
  onStatus: updateSyncStatus,
});

export function triggerCloudSave() {
  if (!state.currentUser || !hasPending()) return Promise.resolve({ ok: false, reason: "not-ready" });
  return cloudQueue.schedule();
}

function removeInFlightBatch(batch) {
  const index = inFlightLedgerBatches.indexOf(batch);
  if (index >= 0) inFlightLedgerBatches.splice(index, 1);
}

function mergeLedgerUpdates(target, updates) {
  Object.assign(target.balances, updates?.balances || {});
  Object.assign(target.entries, updates?.entries || {});
  Object.assign(target.settings, updates?.settings || {});
  Object.assign(target.operationsById, updates?.operationsById || {});
}

function hasOutstandingLedgerWork() {
  return hasPending() || inFlightLedgerBatches.some(batch => batch.year === state.activeYear);
}

/** @param {Array<{ key: string }>} conflicts */
function showSettingsConflictPrompt(conflicts) {
  const keys = conflicts.map(conflict => conflict.key).join(", ");
  void requestAppConfirmation({
    title: t("sync_conflict_title"),
    message: t("sync_conflict_message", { keys }),
    confirmLabel: t("sync_conflict_keep_local"),
    cancelLabel: t("cancel"),
  }).catch(() => {});
}

function ledgerSnapshotWithLocalUpdates(cloudData) {
  const next = normalizeLegacyLedger(cloudData);
  const conflicts = [];
  inFlightLedgerBatches
    .filter(batch => batch.year === state.activeYear)
    .forEach(batch => {
      mergeLedgerUpdates(next, { ...batch.updates, settings: {} });
      const reconciled = reconcileSettingsSnapshot({
        cloudSettings: next.settings,
        pendingSettings: batch.updates.settings,
        pendingBases: batch.settingsBases?.settings,
      });
      next.settings = reconciled.settings;
      conflicts.push(...reconciled.conflicts);
    });
  const pending = copyPending();
  const reconciled = reconcileSettingsSnapshot({
    cloudSettings: next.settings,
    pendingSettings: pending.settings,
    pendingBases: copyPendingSettingsBases().settings,
  });
  next.settings = reconciled.settings;
  conflicts.push(...reconciled.conflicts);
  mergeLedgerUpdates(next, { ...pending, settings: {} });
  state.syncConflicts = { settings: conflicts };
  return next;
}

export function setupRealtimeListener({
  initialLoadTimeoutMs = 15000,
  onSnapshotApplied = () => {},
  onStreakRefresh = () => {},
  onSettingsConflict = showSettingsConflictPrompt,
} = {}) {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  if (unsubscribePreviousYearSnapshot) unsubscribePreviousYearSnapshot();
  if (initialLedgerLoadTimerId !== null) clearTimeout(initialLedgerLoadTimerId);

  // Track whether both the current-year and previous-year snapshots have arrived.
  let previousYearLoaded = false;
  let currentYearLoaded = false;
  let lastSettingsConflictSignature = "";

  function tryCompleteInitialLoad() {
    if (previousYearLoaded && currentYearLoaded) {
      if (initialLedgerLoadTimerId !== null) {
        clearTimeout(initialLedgerLoadTimerId);
        initialLedgerLoadTimerId = null;
      }
      completeInitialLedgerLoad();
    }
  }

  initialLedgerLoadTimerId = setTimeout(() => {
    updateSyncStatus("error");
    completeInitialLedgerLoad();
  }, initialLoadTimeoutMs);

  const docRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + state.activeYear);
  const previousDocRef = doc(db, "artifacts", projectId, "public", "data", "ledgers", "shared_ledger_" + (state.activeYear - 1));

  unsubscribePreviousYearSnapshot = onSnapshot(previousDocRef, (snapshot) => {
    state.previousYearEntries = snapshot.exists() ? (snapshot.data().entries || {}) : {};
    previousYearLoaded = true;
    refreshStreakFromSnapshot(onStreakRefresh);
    tryCompleteInitialLoad();
  }, (error) => {
    console.error("拉取上一年度数据失败:", error);
    previousYearLoaded = true;
    currentYearLoaded = true;
    tryCompleteInitialLoad();
  });

  unsubscribeSnapshot = onSnapshot(docRef, (snapshot) => {
    try {
      const localWritePending = Boolean(snapshot.metadata?.hasPendingWrites);
      state.appState = ledgerSnapshotWithLocalUpdates(snapshot.exists() ? snapshot.data() : {});
      if (state.syncConflicts.settings.length > 0) {
        const signature = JSON.stringify(state.syncConflicts.settings);
        if (signature !== lastSettingsConflictSignature) {
          lastSettingsConflictSignature = signature;
          onSettingsConflict(state.syncConflicts.settings);
        }
      } else {
        lastSettingsConflictSignature = "";
      }
      currentYearLoaded = true;
      onSnapshotApplied();
      refreshStreakFromSnapshot(onStreakRefresh);
      updateSyncStatus(localWritePending || hasOutstandingLedgerWork() ? "syncing" : "synced");
    } catch (error) {
      console.error("刷新云端账本界面失败:", error);
      updateSyncStatus("error");
      currentYearLoaded = true;
      previousYearLoaded = true;
    } finally {
      tryCompleteInitialLoad();
    }
  }, (error) => {
    console.error("拉取数据失败:", error);
    updateSyncStatus("error");
    currentYearLoaded = true;
    previousYearLoaded = true;
    tryCompleteInitialLoad();
  });
}

export function teardownListener() {
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  if (unsubscribePreviousYearSnapshot) { unsubscribePreviousYearSnapshot(); unsubscribePreviousYearSnapshot = null; }
  if (initialLedgerLoadTimerId !== null) { clearTimeout(initialLedgerLoadTimerId); initialLedgerLoadTimerId = null; }
}

function normalizeLegacyLedger(data, { omitEmptyOperations = false } = {}) {
  const normalized = {
    balances: data?.balances || {},
    entries: data?.entries || {},
    settings: data?.settings || {},
  };
  const operationsById = data?.operationsById || {};
  if (!omitEmptyOperations || Object.keys(operationsById).length > 0) normalized.operationsById = operationsById;
  return normalized;
}

function recoveryTimestamp(value) {
  return value.replace(/[-:]/g, "").replace(".", "");
}

export async function sha256Hex(serialized, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function backupFailure(message, cause) {
  const error = new Error(message);
  error.code = "BACKUP_FAILED";
  if (cause) error.cause = cause;
  return error;
}

function recoveryStoragePayload(recovery) {
  return JSON.stringify({
    fileName: recovery.fileName,
    hash: recovery.hash,
    serialized: recovery.serialized,
  });
}

function recoveryStorageKey(recovery) {
  return IMPORT_RECOVERY_STORAGE_PREFIX + recovery.fileName;
}

export async function downloadRecoveryFile(recovery, {
  storage = globalThis.localStorage,
  documentRef = document,
  urlApi = URL,
} = {}) {
  const storageKey = recoveryStorageKey(recovery);
  const storagePayload = recoveryStoragePayload(recovery);
  try {
    if (!storage) throw new Error("local recovery storage is unavailable");
    storage.setItem(storageKey, storagePayload);
    if (storage.getItem(storageKey) !== storagePayload) {
      throw new Error("local recovery storage verification failed");
    }
  } catch (error) {
    throw backupFailure("Import recovery point failed", error);
  }

  let url = null;
  try {
    const blob = new Blob([recovery.serialized], { type: "application/json;charset=utf-8" });
    url = urlApi.createObjectURL(blob);
    const link = documentRef.createElement("a");
    link.href = url;
    link.download = recovery.fileName;
    link.click();
    return {
      storageKey,
      fileName: recovery.fileName,
      hash: recovery.hash,
    };
  } catch (error) {
    throw backupFailure("Import recovery point failed", error);
  } finally {
    if (url) urlApi.revokeObjectURL(url);
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
  const validation = validateLegacyImport(importedData, { year, serializedBytes: new TextEncoder().encode(importedText).length });
  if (!validation.ok) {
    const error = new Error("Legacy import data is invalid");
    error.code = validation.code;
    error.path = validation.path;
    throw error;
  }
  if (!(await confirmOverwrite())) return { ok: false, reason: "cancelled" };

  const currentLedger = normalizeLegacyLedger(await readCurrentLedger(), { omitEmptyOperations: true });
  const serialized = serializeLegacyImport(currentLedger);
  const recoveryValidation = validateLegacyImport(currentLedger, { year, serializedBytes: new TextEncoder().encode(serialized).length });
  if (!recoveryValidation.ok) {
    const error = backupFailure("Import recovery point failed");
    error.validationCode = recoveryValidation.code;
    error.path = recoveryValidation.path;
    throw error;
  }
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
    if (error?.code === "BACKUP_FAILED") throw error;
    throw backupFailure("Import recovery point failed", error);
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
    confirmOverwrite: () => requestAppConfirmation({ message: t("confirm_import"), title: t("app_name"), destructive: true }),
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
