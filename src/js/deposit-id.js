let fallbackSequence = 0;

export function createDepositId() {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${(fallbackSequence++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `deposit-${suffix}`;
}
