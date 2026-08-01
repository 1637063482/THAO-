import { createEmptyDepositDocument } from "../../js/deposit-schema.js";
import { depositErrorMessage } from "../../js/deposit-errors.js";
import { createDepositId } from "../../js/deposit-id.js";
import {
  bindDepositForm,
  bindDepositSettlementForm,
  renderDepositForm,
  renderDepositSettlementForm,
} from "./form.js";
import { createDepositReminderController } from "./reminder-controller.js";
import {
  bindDepositManagement,
  buildDepositViewModel,
  renderDepositManagement,
} from "./view.js";

/** @type {Promise<typeof import("../../application/deposits/settle-deposit.ts")> | null} */
let settlementModulePromise = null;

function loadSettlementModule() {
  if (!settlementModulePromise) {
    settlementModulePromise = import("../../application/deposits/settle-deposit.ts")
      .catch((error) => {
        settlementModulePromise = null;
        throw error;
      });
  }
  return settlementModulePromise;
}

/** @param {import("../../types/app-state").DepositControllerDependencies} dependencies */
export function createDepositController(dependencies) {
  const {
    state,
    hosts,
    createRepository,
    subscribe,
    getToday,
    getNextMidnightDelay,
    getLocale,
    queueLegacyInterest,
    confirm,
    isOnline,
    isDocumentHidden,
    addRuntimeListener,
    setTimer,
    clearTimer,
  } = dependencies;

  /** @type {import("../../types/app-state").AuthUser | null} */
  let activeUser = null;
  /** @type {import("../../types/app-state").DepositRepository | null} */
  let repository = null;
  /** @type {(() => void) | null} */
  let unsubscribe = null;
  /** @type {Array<() => void>} */
  let runtimeCleanups = [];
  /** @type {number | null} */
  let midnightTimer = null;
  /** @type {import("../../types/app-state").DepositUiStatus} */
  let uiStatus = "loading";
  let uiError = "";
  /** @type {import("../../types/app-state").DepositFilter} */
  let filter = "all";
  let dataReady = false;
  let snapshotFromCache = false;

  const reminderController = createDepositReminderController({
    root: hosts.reminder,
    getDocument: () => state.depositDocument,
    getToday,
    getLocale,
    isAuthenticated: () => Boolean(activeUser),
    isReady: () => dataReady,
    isOffline: () => !isOnline() || snapshotFromCache,
    acknowledge: key => requireRepository().acknowledge(key),
  });

  function requireRepository() {
    if (!repository) throw new Error("Deposit repository is unavailable");
    return repository;
  }

  function closeForm() {
    if (hosts.form) hosts.form.innerHTML = "";
  }

  /** @param {string} id @returns {import("../../types/app-state").StoredDeposit} */
  function settlementRecord(id) {
    const record = state.depositDocument.depositsById[id];
    if (!record) throw new Error("Deposit is unavailable");
    return { id, ...record };
  }

  /**
   * @param {string} id
   * @param {import("../../types/app-state").StoredDeposit} record
   * @returns {import("../../application/deposits/settle-deposit").RolloverInput}
   */
  function rolloverInput(id, record) {
    return {
      id,
      institutionName: record.institutionName,
      productName: record.productName,
      principalVnd: record.principalVnd,
      annualRatePpm: record.annualRatePpm,
      openedOn: record.openedOn,
      maturesOn: record.maturesOn,
      expectedInterestVnd: record.expectedInterestVnd,
      actualInterestVnd: record.actualInterestVnd,
      reminderDays: [...record.reminderDays],
      remindersEnabled: record.remindersEnabled,
      status: "ACTIVE",
      redeemedOn: null,
      rolledOverToDepositId: null,
      note: record.note,
    };
  }

  function settlementDependencies() {
    const currentRepository = requireRepository();
    /**
     * @param {string} id
     * @param {number} version
     * @param {Record<string, unknown>} changes
     */
    const updateDeposit = (id, version, changes) => currentRepository.update(
      id,
      version,
      /** @type {import("../../types/app-state").DepositChanges} */ (changes),
    );
    return {
      updateDeposit,
      queueLegacyInterest,
    };
  }

  function rolloverDependencies() {
    const currentRepository = requireRepository();
    /** @param {string} id */
    const getDeposit = async (id) => {
      return /** @type {Record<string, unknown> | null} */ (
        /** @type {unknown} */ (await currentRepository.get(id))
      );
    };
    /** @param {import("../../application/deposits/settle-deposit").RolloverInput} input */
    const createDeposit = (input) => currentRepository.create({
      ...input,
      reminderDays: [...input.reminderDays],
    });
    return {
      ...settlementDependencies(),
      getDeposit,
      createDeposit,
    };
  }

  /** @param {string | null} [id] */
  function openForm(id = null) {
    if (!hosts.form) return;
    const deposit = id ? state.depositDocument.depositsById[id] : null;
    const formId = id || createDepositId();
    const locale = getLocale();
    hosts.form.dataset.locale = locale;
    hosts.form.innerHTML = renderDepositForm({ locale, id: formId, deposit });
    bindDepositForm(hosts.form, {
      onClose: closeForm,
      locale,
      async onSubmit(input, { expectedVersion }) {
        const currentRepository = requireRepository();
        uiStatus = "syncing";
        const { id: inputId, ...changes } = input;
        try {
          if (deposit) await currentRepository.update(inputId, expectedVersion, changes);
          else await currentRepository.create(input);
        } catch (error) {
          uiStatus = "error";
          throw error;
        }
        closeForm();
        refresh();
      },
    });
  }

  /** @param {string} id @param {"redeem" | "rollover"} mode */
  function openSettlement(id, mode) {
    if (!hosts.form) return;
    void loadSettlementModule().catch(() => {});
    const deposit = settlementRecord(id);
    const locale = getLocale();
    hosts.form.dataset.locale = locale;
    hosts.form.innerHTML = renderDepositSettlementForm({ locale, deposit, mode, today: getToday() });
    bindDepositSettlementForm(hosts.form, {
      locale,
      confirm,
      onClose: closeForm,
      async onSubmit(input) {
        uiStatus = "syncing";
        refresh();
        try {
          const { buildRolloverDepositId, redeemDeposit, rolloverDeposit } = await loadSettlementModule();
          if (input.mode === "redeem") {
            await redeemDeposit({
              deposit,
              settledOn: input.settledOn,
              actualInterestVnd: input.actualInterestVnd,
              writeInterestToLedger: input.writeInterestToLedger,
            }, settlementDependencies());
          } else {
            const next = { id: buildRolloverDepositId(deposit), ...input.rollover };
            await rolloverDeposit({
              deposit,
              rolloverDeposit: next,
              actualInterestVnd: input.actualInterestVnd,
              writeInterestToLedger: input.writeInterestToLedger,
            }, rolloverDependencies());
          }
          closeForm();
          refresh();
        } catch (error) {
          uiStatus = "error";
          uiError = depositErrorMessage(error, getLocale(), "list");
          refresh();
          throw error;
        }
      },
    });
  }

  /** @param {string} id */
  async function retryInterest(id) {
    const deposit = settlementRecord(id);
    const locale = getLocale();
    const message = locale === "zh-CN"
      ? "确认只将实收利息记入收入？本金不会记作收入。"
      : "Chỉ ghi tiền lãi thực nhận vào thu nhập? Tiền gốc sẽ không được ghi.";
    if (confirm && !(await confirm(message))) return;
    uiStatus = "syncing";
    refresh();
    try {
      const { redeemDeposit, rolloverDeposit } = await loadSettlementModule();
      if (deposit.status === "REDEEMED") {
        await redeemDeposit({
          deposit,
          settledOn: /** @type {string} */ (deposit.redeemedOn),
          actualInterestVnd: deposit.actualInterestVnd,
          writeInterestToLedger: true,
        }, settlementDependencies());
      } else if (deposit.status === "ROLLED_OVER") {
        const target = settlementRecord(/** @type {string} */ (deposit.rolledOverToDepositId));
        await rolloverDeposit({
          deposit,
          rolloverDeposit: rolloverInput(target.id, target),
          actualInterestVnd: deposit.actualInterestVnd,
          writeInterestToLedger: true,
        }, rolloverDependencies());
      }
      uiStatus = "synced";
      refresh();
    } catch (error) {
      uiStatus = "error";
      uiError = depositErrorMessage(error, getLocale(), "list");
      refresh();
      throw error;
    }
  }

  function refresh() {
    if (!hosts.root) return;
    const viewModel = buildDepositViewModel({
      document: state.depositDocument,
      today: getToday(),
      locale: getLocale(),
      status: uiStatus,
      errorMessage: uiError,
      filter,
      ledgerEntries: state.appState.entries,
    });
    hosts.root.innerHTML = renderDepositManagement(viewModel);
    bindDepositManagement(hosts.root, {
      confirm,
      onAdd: () => openForm(),
      onEdit: id => openForm(id),
      onRedeem: id => openSettlement(id, "redeem"),
      onRollover: id => openSettlement(id, "rollover"),
      onRecordInterest: retryInterest,
      async onArchive(id) {
        const record = state.depositDocument.depositsById[id];
        if (!record) throw new Error("Deposit is unavailable");
        uiStatus = "syncing";
        refresh();
        try {
          await requireRepository().archive(id, record.version);
        } catch (error) {
          uiStatus = "error";
          uiError = depositErrorMessage(error, getLocale(), "list");
          refresh();
          throw error;
        }
      },
      async onDelete(id) {
        const record = state.depositDocument.depositsById[id];
        if (!record) throw new Error("Deposit is unavailable");
        uiStatus = "syncing";
        refresh();
        try {
          await requireRepository().delete(id, record.version);
        } catch (error) {
          uiStatus = "error";
          uiError = depositErrorMessage(error, getLocale(), "list");
          refresh();
          throw error;
        }
      },
      onFilter: next => {
        filter = next;
        refresh();
      },
    });
  }

  function scheduleMidnightCheck() {
    midnightTimer = setTimer(() => {
      midnightTimer = null;
      reminderController.check();
      refresh();
      scheduleMidnightCheck();
    }, getNextMidnightDelay());
  }

  function installRuntimeResources() {
    runtimeCleanups = [
      addRuntimeListener("window", "offline", () => {
        uiStatus = "offline";
        refresh();
        reminderController.check();
      }),
      addRuntimeListener("window", "online", () => {
        if (activeUser) start(activeUser);
      }),
      addRuntimeListener("window", "locale-changed", () => {
        refresh();
        reminderController.check();
      }),
      addRuntimeListener("window", "app-dom-rebuilt", refresh),
      addRuntimeListener("window", "app-route-entered", reminderController.check),
      addRuntimeListener("window", "focus", reminderController.check),
      addRuntimeListener("document", "visibilitychange", () => {
        if (!isDocumentHidden()) reminderController.check();
      }),
    ];
    scheduleMidnightCheck();
  }

  function stop() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    for (const cleanup of runtimeCleanups) cleanup();
    runtimeCleanups = [];
    if (midnightTimer !== null) clearTimer(midnightTimer);
    midnightTimer = null;
    repository = null;
    activeUser = null;
    uiStatus = "loading";
    uiError = "";
    filter = "all";
    dataReady = false;
    snapshotFromCache = false;
    closeForm();
    reminderController.destroy();
    state.depositDocument = createEmptyDepositDocument();
    refresh();
  }

  /** @param {import("../../types/app-state").AuthUser} user */
  function start(user) {
    if (!user?.uid) throw new Error("Authenticated user is required");
    stop();
    activeUser = user;
    repository = createRepository(user);
    uiStatus = isOnline() ? "loading" : "offline";
    refresh();
    installRuntimeResources();
    unsubscribe = subscribe({
      onChange(_document, metadata = { fromCache: false }) {
        dataReady = true;
        snapshotFromCache = Boolean(metadata.fromCache);
        uiStatus = isOnline() && !snapshotFromCache ? "synced" : "offline";
        refresh();
        reminderController.check();
      },
      onError() {
        snapshotFromCache = true;
        uiStatus = isOnline() ? "error" : "offline";
        refresh();
      },
    });
  }

  return { start, stop };
}
