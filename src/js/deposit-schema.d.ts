export const DEPOSIT_SCHEMA_VERSION: 1;
export const DEPOSIT_BACKUP_VERSION: 1;
export const MAX_DEPOSITS: 100;
export const MAX_ACKNOWLEDGEMENTS: 500;
export function createEmptyDepositDocument<T = Record<string, unknown>>(): T;
export function validateDepositDocument<T>(value: T): T;
export function serializeDepositBackup(value: unknown): string;
