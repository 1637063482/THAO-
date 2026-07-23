export interface SettlementDeposit {
  readonly id: string;
  readonly version: number;
  readonly status: "ACTIVE" | "REDEEMED" | "ROLLED_OVER";
  readonly principalVnd: number;
  readonly maturesOn: string;
  readonly actualInterestVnd: number | null;
  readonly redeemedOn: string | null;
  readonly rolledOverToDepositId: string | null;
}

export interface RolloverInput {
  readonly id: string;
  readonly institutionName: string;
  readonly productName: string;
  readonly principalVnd: number;
  readonly annualRatePpm: number;
  readonly openedOn: string;
  readonly maturesOn: string;
  readonly expectedInterestVnd: number | null;
  readonly actualInterestVnd: number | null;
  readonly reminderDays: readonly number[];
  readonly remindersEnabled: boolean;
  readonly status: "ACTIVE";
  readonly redeemedOn: null;
  readonly rolledOverToDepositId: null;
  readonly note: string;
}

interface SettlementDependencies {
  updateDeposit(id: string, version: number, changes: Record<string, unknown>): Promise<unknown>;
  queueLegacyInterest(input: { amountVnd: number; dateKey: string; operationId: string }): Promise<unknown> | unknown;
}

interface RolloverDependencies extends SettlementDependencies {
  getDeposit(id: string): Promise<Record<string, unknown> | null>;
  createDeposit(input: RolloverInput): Promise<unknown>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const rolloverFields: ReadonlyArray<keyof RolloverInput> = [
  "id", "institutionName", "productName", "principalVnd", "annualRatePpm", "openedOn", "maturesOn",
  "expectedInterestVnd", "actualInterestVnd", "reminderDays", "remindersEnabled", "status", "redeemedOn",
  "rolledOverToDepositId", "note",
];

function requireDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) throw new Error(`${field} must use YYYY-MM-DD`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error(`${field} is invalid`);
}
function requireInterest(value: number | null): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error("Actual interest must be a non-negative safe integer VND amount");
}
function operationId(deposit: SettlementDeposit): string { return `deposit-interest-${deposit.id}-${deposit.maturesOn}`; }
function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}
export function buildRolloverDepositId(deposit: Pick<SettlementDeposit, "id" | "maturesOn">): string {
  const full = `rollover-${deposit.id}-${deposit.maturesOn}`;
  if (full.length <= 80) return full;
  const suffix = `-${deposit.maturesOn}-${stableHash(deposit.id)}`;
  return `rollover-${deposit.id.slice(0, 80 - 9 - suffix.length)}${suffix}`;
}
function mustQueue(value: number | null, confirmed: boolean): value is number { return confirmed && value !== null && value > 0; }
function assertSettlementDate(deposit: SettlementDeposit, settledOn: string): void {
  requireDate(settledOn, "Settlement date");
  if (settledOn < deposit.maturesOn) throw new Error("Settlement date cannot precede maturity");
}

export async function redeemDeposit(
  command: { deposit: SettlementDeposit; settledOn: string; actualInterestVnd: number | null; writeInterestToLedger: boolean },
  dependencies: SettlementDependencies,
): Promise<{ depositUpdated: boolean; incomeQueued: boolean; operationId: string }> {
  const { deposit, settledOn, actualInterestVnd, writeInterestToLedger } = command;
  if (!ID_RE.test(deposit.id)) throw new Error("Deposit id is invalid");
  assertSettlementDate(deposit, settledOn); requireInterest(actualInterestVnd);
  let depositUpdated = false;
  if (deposit.status === "ACTIVE") {
    await dependencies.updateDeposit(deposit.id, deposit.version, { status: "REDEEMED", redeemedOn: settledOn, actualInterestVnd, rolledOverToDepositId: null });
    depositUpdated = true;
  } else if (deposit.status !== "REDEEMED" || deposit.redeemedOn !== settledOn || deposit.actualInterestVnd !== actualInterestVnd) {
    throw new Error("Settlement conflict with immutable deposit history");
  }
  const stableOperationId = operationId(deposit);
  let incomeQueued = false;
  if (mustQueue(actualInterestVnd, writeInterestToLedger)) {
    await dependencies.queueLegacyInterest({ amountVnd: actualInterestVnd, dateKey: settledOn, operationId: stableOperationId });
    incomeQueued = true;
  }
  return { depositUpdated, incomeQueued, operationId: stableOperationId };
}

function sameRollover(existing: Record<string, unknown>, expected: RolloverInput): boolean {
  return rolloverFields.every(field => JSON.stringify(existing[field]) === JSON.stringify(expected[field]));
}

export async function rolloverDeposit(
  command: { deposit: SettlementDeposit; rolloverDeposit: RolloverInput; actualInterestVnd: number | null; writeInterestToLedger: boolean },
  dependencies: RolloverDependencies,
): Promise<{ targetCreated: boolean; depositUpdated: boolean; incomeQueued: boolean; operationId: string }> {
  const { deposit, rolloverDeposit: next, actualInterestVnd, writeInterestToLedger } = command;
  if (!ID_RE.test(deposit.id)) throw new Error("Deposit id is invalid");
  requireDate(deposit.maturesOn, "Maturity date"); requireInterest(actualInterestVnd); requireDate(next.openedOn, "Rollover opening date"); requireDate(next.maturesOn, "Rollover maturity date");
  if (next.id !== buildRolloverDepositId(deposit)) throw new Error("Rollover id is not deterministic");
  if (next.openedOn < deposit.maturesOn || next.maturesOn <= next.openedOn) throw new Error("Rollover dates are invalid");
  const existing = await dependencies.getDeposit(next.id);
  let targetCreated = false;
  if (existing) {
    if (!sameRollover(existing, next)) throw new Error("Rollover target conflict");
  } else {
    await dependencies.createDeposit(next);
    targetCreated = true;
  }
  let depositUpdated = false;
  if (deposit.status === "ACTIVE") {
    await dependencies.updateDeposit(deposit.id, deposit.version, { status: "ROLLED_OVER", rolledOverToDepositId: next.id, redeemedOn: null, actualInterestVnd });
    depositUpdated = true;
  } else if (deposit.status !== "ROLLED_OVER" || deposit.rolledOverToDepositId !== next.id || deposit.actualInterestVnd !== actualInterestVnd) {
    throw new Error("Rollover conflict with immutable deposit history");
  }
  const stableOperationId = operationId(deposit);
  let incomeQueued = false;
  if (mustQueue(actualInterestVnd, writeInterestToLedger)) {
    await dependencies.queueLegacyInterest({ amountVnd: actualInterestVnd, dateKey: next.openedOn, operationId: stableOperationId });
    incomeQueued = true;
  }
  return { targetCreated, depositUpdated, incomeQueued, operationId: stableOperationId };
}
