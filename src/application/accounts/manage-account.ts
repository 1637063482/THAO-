import type { Account, CreateAccountInput, UpdateAccountInput } from "../../domain/account";

export interface AccountStore {
  create(input: CreateAccountInput, now: string): Promise<Account>;
  update(id: string, expectedVersion: number, changes: UpdateAccountInput, now: string): Promise<Account>;
  archive(id: string, expectedVersion: number, now: string): Promise<Account>;
}

export interface Clock {
  now(): string;
}

export function createAccountUseCase(store: AccountStore, clock: Clock, input: CreateAccountInput) {
  return store.create(input, clock.now());
}

export function updateAccountUseCase(store: AccountStore, clock: Clock, id: string, expectedVersion: number, changes: UpdateAccountInput) {
  return store.update(id, expectedVersion, changes, clock.now());
}

export function archiveAccountUseCase(store: AccountStore, clock: Clock, id: string, expectedVersion: number) {
  return store.archive(id, expectedVersion, clock.now());
}
