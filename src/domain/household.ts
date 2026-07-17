import type { CurrencyCode } from "./currency";

export interface Household {
  readonly id: string;
  readonly name: string;
  readonly ownerUid: string;
  readonly baseCurrency: CurrencyCode;
  readonly timezone: string;
  readonly schemaVersion: number;
}
