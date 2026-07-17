import type { CurrencyCode } from "./currency";
import { DomainError } from "./errors";
import type { Money } from "./money";

export type AccountType = "cash" | "bank" | "ewallet" | "other";

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: CurrencyCode;
  readonly openingBalance: Money;
  readonly openingDate: string;
  readonly version: number;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CreateAccountInput = Pick<Account, "id" | "name" | "type" | "currency" | "openingBalance" | "openingDate">;
export type UpdateAccountInput = Partial<Pick<Account, "name" | "type">>;

function assertText(value: string, field: "id" | "name") {
  const normalized = value.trim();
  if (!normalized) throw new DomainError(`INVALID_ACCOUNT_${field.toUpperCase()}`, `Account ${field} is required`);
  if (normalized.length > 80) throw new DomainError(`INVALID_ACCOUNT_${field.toUpperCase()}`, `Account ${field} is too long`);
  return normalized;
}

function assertIsoInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new DomainError("INVALID_INSTANT", "Account timestamp must be an ISO UTC instant");
  }
}

function assertLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new DomainError("INVALID_OPENING_DATE", "Account opening date is invalid");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new DomainError("INVALID_OPENING_DATE", "Account opening date is invalid");
  }
}

function assertVersion(account: Account, expectedVersion: number) {
  if (account.version !== expectedVersion) throw new DomainError("ACCOUNT_VERSION_CONFLICT", "Account version conflict");
}

export function createAccount(input: CreateAccountInput, now: string): Account {
  assertIsoInstant(now);
  assertLocalDate(input.openingDate);
  if (input.openingBalance.currency !== input.currency) {
    throw new DomainError("ACCOUNT_CURRENCY_MISMATCH", "Opening balance currency must match account currency");
  }
  return Object.freeze({
    ...input,
    id: assertText(input.id, "id"),
    name: assertText(input.name, "name"),
    openingBalance: Object.freeze({ ...input.openingBalance }),
    version: 1,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateAccount(account: Account, expectedVersion: number, changes: UpdateAccountInput, now: string): Account {
  assertVersion(account, expectedVersion);
  assertIsoInstant(now);
  if (account.archivedAt) throw new DomainError("ACCOUNT_ARCHIVED", "Archived account cannot be updated");
  return Object.freeze({
    ...account,
    ...changes,
    name: changes.name === undefined ? account.name : assertText(changes.name, "name"),
    version: account.version + 1,
    updatedAt: now,
  });
}

export function archiveAccount(account: Account, expectedVersion: number, now: string): Account {
  assertVersion(account, expectedVersion);
  assertIsoInstant(now);
  if (account.archivedAt) return account;
  return Object.freeze({ ...account, archivedAt: now, updatedAt: now, version: account.version + 1 });
}

export function assertAccountUsable(account: Account): void {
  if (account.archivedAt) throw new DomainError("ACCOUNT_ARCHIVED", "Archived account cannot be used for new transactions");
}
