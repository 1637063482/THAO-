/** @param {Record<string, unknown> | null | undefined} record @param {string} key */
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record || {}, key);
}

/** @param {unknown} left @param {unknown} right */
function sameValue(left, right) {
  return Object.is(left, right);
}

/**
 * Reconcile a remote settings snapshot with a local, changed-key patch.
 * A base value is required before a same-key conflict is reported; this keeps
 * old callers that only provide a pending map backward-compatible.
 *
 * @param {{
 *   cloudSettings?: Record<string, unknown>,
 *   pendingSettings?: Record<string, unknown>,
 *   pendingBases?: Record<string, { present: boolean, value?: unknown }>,
 * }} options
 * @returns {{ settings: Record<string, unknown>, conflicts: Array<{ key: string, baseValue: unknown, localValue: unknown, remoteValue: unknown }> }}
 */
export function reconcileSettingsSnapshot({ cloudSettings = {}, pendingSettings = {}, pendingBases = {} } = {}) {
  const settings = { ...cloudSettings };
  /** @type {Array<{ key: string, baseValue: unknown, localValue: unknown, remoteValue: unknown }>} */
  const conflicts = [];

  Object.entries(pendingSettings).forEach(([key, localValue]) => {
    const base = pendingBases[key];
    const remotePresent = hasOwn(cloudSettings, key);
    const remoteValue = cloudSettings[key];
    const remoteChanged = Boolean(base) && (
      Boolean(base.present) !== remotePresent
      || !sameValue(base.value, remoteValue)
    );

    if (remoteChanged && !sameValue(localValue, remoteValue)) {
      conflicts.push({
        key,
        baseValue: base.present ? base.value : undefined,
        localValue,
        remoteValue,
      });
    }
    settings[key] = localValue;
  });

  return { settings, conflicts };
}

/** @param {Record<string, import("../types/app-state").LedgerSettingValue>} settings @param {string} key */
export function captureSettingBase(settings = {}, key) {
  return {
    present: hasOwn(settings, key),
    value: settings[key],
  };
}
