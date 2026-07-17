import { DomainError } from "./errors";

export const CURRENCIES = {
  VND: { code: "VND", minorDigits: 0 },
  CNY: { code: "CNY", minorDigits: 2 },
  JPY: { code: "JPY", minorDigits: 0 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function currencyInfo(code: string) {
  const info = CURRENCIES[code as CurrencyCode];
  if (!info) throw new DomainError("UNSUPPORTED_CURRENCY", `Unsupported currency: ${code}`);
  return info;
}
