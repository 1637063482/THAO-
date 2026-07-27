export function createLedgerInputController({
  state,
  root,
  windowRoot,
  getActiveRate,
  isValidCurrencyRate,
  parseCurrencyInputToVnd,
  formatVndForCurrencyInput,
  formatDisplay,
  evaluate,
  updateActivity,
  triggerSave,
  refreshCalculatedViews,
  refreshDashboard,
  updateStreak,
  showFxUnavailable,
  isOnline = () => windowRoot.navigator.onLine,
  getUnsavedWarning = () => "",
  setTimer = (callback, delay) => windowRoot.setTimeout(callback, delay),
  clearTimer = timer => windowRoot.clearTimeout(timer),
}) {
  let started = false;
  let saveTimer = null;

  function isMathOrCell(element) {
    if (element.classList.contains("remark-input")) return false;
    return element.classList.contains("math-input") || element.classList.contains("cell-input");
  }

  function persistInputValue(target, vndValue) {
    const dataType = target.getAttribute("data-type");
    const dataKey = target.getAttribute("data-key");
    if (dataType === "balance" && target.id) {
      state.appState.balances[target.id] = vndValue;
      if (!state.pendingUpdates.balances) state.pendingUpdates.balances = {};
      state.pendingUpdates.balances[target.id] = vndValue;
    } else if (dataType === "entry" && dataKey) {
      state.appState.entries[dataKey] = vndValue;
      if (!state.pendingUpdates.entries) state.pendingUpdates.entries = {};
      state.pendingUpdates.entries[dataKey] = vndValue;
    }
  }

  function scheduleSave() {
    if (saveTimer !== null) clearTimer(saveTimer);
    saveTimer = setTimer(() => {
      saveTimer = null;
      refreshCalculatedViews();
      refreshDashboard();
    }, 150);
    triggerSave();
  }

  function onInput(event) {
    const target = event.target;
    if (target.tagName !== "INPUT" || target.id.startsWith("qa-") || target.id === "monthly-budget-input") return;
    if (state.currentUser) updateActivity();
    const value = target.value;
    if (isMathOrCell(target)) {
      if (state.currentCurrency === "CNY") {
        target.dataset.currencyInputDirty = "1";
        return;
      }
      target.dataset.raw = value;
    }
    persistInputValue(target, value);
    scheduleSave();
  }

  function onFocusIn(event) {
    const target = event.target;
    if (!isMathOrCell(target) || target.readOnly) return;
    target.dataset.currencyRawBefore = target.dataset.raw || "";
    if (state.currentCurrency === "VND") {
      if (target.dataset.raw !== undefined && target.dataset.raw !== "") target.value = target.dataset.raw;
    } else {
      target.value = formatVndForCurrencyInput(target.dataset.raw, state.currentCurrency, getActiveRate());
    }
    target.dataset.currencyViewBefore = target.value;
  }

  function clearCurrencyDraft(target) {
    delete target.dataset.currencyRawBefore;
    delete target.dataset.currencyViewBefore;
    delete target.dataset.currencyInputDirty;
  }

  function onFocusOut(event) {
    const target = event.target;
    if (isMathOrCell(target) && !target.readOnly) {
      const rawInput = target.value;
      if (state.currentCurrency === "VND") {
        target.dataset.raw = rawInput;
        target.value = rawInput ? formatDisplay(evaluate(rawInput)) : "";
      } else {
        const activeRate = getActiveRate();
        if (!isValidCurrencyRate(activeRate)) {
          target.dataset.raw = target.dataset.currencyRawBefore || "";
          target.value = target.dataset.currencyViewBefore || "";
          showFxUnavailable();
          clearCurrencyDraft(target);
          return;
        }
        const vndValue = parseCurrencyInputToVnd(rawInput, {
          currency: state.currentCurrency,
          rate: activeRate,
          previousRawVnd: target.dataset.currencyRawBefore,
          previousViewValue: target.dataset.currencyViewBefore,
          evaluate,
        });
        target.dataset.raw = vndValue;
        target.value = rawInput ? formatDisplay(vndValue) : "";
        if (target.dataset.currencyInputDirty === "1") {
          persistInputValue(target, vndValue);
          scheduleSave();
        }
      }
      clearCurrencyDraft(target);
    }
    const dataKey = target.getAttribute("data-key");
    if (dataKey && !dataKey.endsWith("_remark")) updateStreak();
  }

  function onBeforeUnload(event) {
    if (!state.isSaving || !isOnline()) return;
    event.preventDefault();
    event.returnValue = getUnsavedWarning();
  }

  function start() {
    if (started) stop();
    root.addEventListener("input", onInput);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    windowRoot.addEventListener("beforeunload", onBeforeUnload);
    started = true;
  }

  function stop() {
    if (!started) return;
    root.removeEventListener("input", onInput);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    windowRoot.removeEventListener("beforeunload", onBeforeUnload);
    if (saveTimer !== null) clearTimer(saveTimer);
    saveTimer = null;
    started = false;
  }

  return { scheduleSave, start, stop };
}
