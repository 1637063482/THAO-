import { buildRolloverDepositId, redeemDeposit, rolloverDeposit } from "../../application/deposits/settle-deposit.ts";
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

  let activeUser = null;
  let repository = null;
  let unsubscribe = null;
  let runtimeCleanups = [];
  let midnightTimer = null;
  let uiStatus = "loading";
  let uiError = "";
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

  function settlementRecord(id) {
    const record = state.depositDocument.depositsById[id];
    if (!record) throw new Error("Deposit is unavailable");
    return { id, ...record };
  }

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
    return {
      updateDeposit: (id, version, changes) => currentRepository.update(id, version, changes),
      queueLegacyInterest,
    };
  }

  function rolloverDependencies() {
    const currentRepository = requireRepository();
    return {
      ...settlementDependencies(),
      getDeposit: id => currentRepository.get(id),
      createDeposit: input => currentRepository.create(input),
    };
  }

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

  function openSettlement(id, mode) {
    if (!hosts.form) return;
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

  async function retryInterest(id) {
    const deposit = settlementRecord(id);
    const locale = getLocale();
    const message = locale === "zh-CN"
      ? "确认只将实收利息记入收入？本金不会记作收入。"
      : "Chỉ ghi tiền lãi thực nhận vào thu nhập? Tiền gốc sẽ không được ghi.";
    if (confirm && !confirm(message)) return;
    uiStatus = "syncing";
    refresh();
    try {
      if (deposit.status === "REDEEMED") {
        await redeemDeposit({
          deposit,
          settledOn: deposit.redeemedOn,
          actualInterestVnd: deposit.actualInterestVnd,
          writeInterestToLedger: true,
        }, settlementDependencies());
      } else if (deposit.status === "ROLLED_OVER") {
        const target = settlementRecord(deposit.rolledOverToDepositId);
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

  function start(user) {
    if (!user?.uid) throw new Error("Authenticated user is required");
    stop();
    activeUser = user;
    repository = createRepository(user);
    uiStatus = isOnline() ? "loading" : "offline";
    refresh();
    installRuntimeResources();
    unsubscribe = subscribe({
      onChange(_document, metadata = {}) {
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
