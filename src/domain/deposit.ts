import { DomainError } from "./errors";

export type DepositStatus = "ACTIVE" | "MATURED" | "REDEEMED" | "ROLLED_OVER";
export interface Deposit {
  readonly id: string;
  readonly principalVnd: number;
  readonly annualRatePpm: number;
  readonly startDate: string;
  readonly maturityDate: string;
  readonly status: DepositStatus;
  readonly expectedInterestVndOverride: number | null;
  readonly actualInterestVnd: number | null;
}
export interface DepositSummary { readonly currentPrincipalVnd: number; readonly expectedInterestVnd: number; readonly expectedMaturityTotalVnd: number; readonly actualInterestVnd: number; }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const transitions: Record<DepositStatus, readonly DepositStatus[]> = {
  ACTIVE: ["MATURED", "REDEEMED", "ROLLED_OVER"], MATURED: ["REDEEMED", "ROLLED_OVER"], REDEEMED: [], ROLLED_OVER: [],
};
function dateValue(value: string): number {
  if (!DATE_RE.test(value)) throw new DomainError("INVALID_DATE", "Date must use YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new DomainError("INVALID_DATE", "Date is not valid");
  return date.getTime();
}
function safeAmount(value: number, name: string, allowNull = false): void {
  if (allowNull && value === null) return;
  if (!Number.isSafeInteger(value) || value < 0) throw new DomainError("INVALID_DEPOSIT_AMOUNT", `${name} must be a non-negative safe integer`);
}
function roundHalfUp(numerator: bigint, denominator: bigint): bigint { return (numerator + denominator / 2n) / denominator; }
function asSafe(value: bigint): number { const result = Number(value); if (!Number.isSafeInteger(result)) throw new DomainError("DEPOSIT_OVERFLOW", "Deposit result exceeds safe integer range"); return result; }

export function createDeposit(input: Omit<Deposit, "status"> & { status?: DepositStatus }): Deposit {
  safeAmount(input.principalVnd, "Principal"); safeAmount(input.annualRatePpm, "Annual rate");
  if (input.annualRatePpm > 1_000_000) throw new DomainError("INVALID_RATE", "Annual rate must not exceed 100%");
  if (input.expectedInterestVndOverride !== null) safeAmount(input.expectedInterestVndOverride, "Expected interest");
  if (input.actualInterestVnd !== null) safeAmount(input.actualInterestVnd, "Actual interest");
  const start = dateValue(input.startDate); const maturity = dateValue(input.maturityDate);
  if (maturity < start) throw new DomainError("INVALID_DATE_RANGE", "Maturity date must not precede start date");
  return Object.freeze({ ...input, status: input.status || "ACTIVE" });
}

export function actualDays(startDate: string, endDate: string): number {
  const start = dateValue(startDate); const end = dateValue(endDate);
  if (end < start) throw new DomainError("INVALID_DATE_RANGE", "End date must not precede start date");
  return Math.floor((end - start) / 86_400_000);
}

export function deriveDepositStatus(deposit: Deposit, today: string): DepositStatus | "MATURING" {
  dateValue(today);
  if (deposit.status !== "ACTIVE") return deposit.status;
  if (today < deposit.startDate) return "ACTIVE";
  if (today < deposit.maturityDate) return "ACTIVE";
  if (today === deposit.maturityDate) return "MATURING";
  return "MATURED";
}

export function expectedInterestVnd(deposit: Deposit, asOfDate = deposit.maturityDate): number {
  if (deposit.expectedInterestVndOverride !== null) return deposit.expectedInterestVndOverride;
  const cappedDate = asOfDate > deposit.maturityDate ? deposit.maturityDate : asOfDate;
  const days = actualDays(deposit.startDate, cappedDate);
  const yearDays = new Date(Date.UTC(Number(deposit.startDate.slice(0, 4)), 1, 29)).getUTCDate() === 29 ? 366n : 365n;
  return asSafe(roundHalfUp(BigInt(deposit.principalVnd) * BigInt(deposit.annualRatePpm) * BigInt(days), 1_000_000n * yearDays));
}

export function transitionDeposit(deposit: Deposit, next: DepositStatus): Deposit {
  if (!transitions[deposit.status].includes(next)) throw new DomainError("INVALID_STATUS_TRANSITION", `Cannot transition ${deposit.status} to ${next}`);
  return Object.freeze({ ...deposit, status: next });
}

export function summarizeDeposits(deposits: readonly Deposit[], asOfDate: string): DepositSummary {
  let principal = 0n; let expected = 0n; let actual = 0n;
  for (const deposit of deposits) {
    if (deposit.status !== "REDEEMED") principal += BigInt(deposit.principalVnd);
    expected += BigInt(expectedInterestVnd(deposit, asOfDate));
    if (deposit.actualInterestVnd !== null) actual += BigInt(deposit.actualInterestVnd);
  }
  return { currentPrincipalVnd: asSafe(principal), expectedInterestVnd: asSafe(expected), expectedMaturityTotalVnd: asSafe(principal + expected), actualInterestVnd: asSafe(actual) };
}
