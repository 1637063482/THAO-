import { currencyInfo, type CurrencyCode } from "./currency";
import { DomainError } from "./errors";

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function createMoney(amountMinor: number, currency: CurrencyCode): Money {
  currencyInfo(currency);
  if (!Number.isInteger(amountMinor)) throw new DomainError("INVALID_MINOR_UNIT", "Money minor amount must be an integer");
  if (!Number.isSafeInteger(amountMinor)) throw new DomainError("UNSAFE_MINOR_UNIT", "Money minor amount must be a safe integer");
  return Object.freeze({ amountMinor, currency });
}

export function parseMajorAmount(input: string, currency: CurrencyCode): Money {
  const { minorDigits } = currencyInfo(currency);
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) throw new DomainError("INVALID_AMOUNT", "Amount must be a decimal number");
  const fraction = match[3] || "";
  if (fraction.length > minorDigits) throw new DomainError("INVALID_PRECISION", `Amount exceeds ${currency} precision`);
  const factor = 10 ** minorDigits;
  const absolute = Number(match[2]) * factor + Number(fraction.padEnd(minorDigits, "0") || 0);
  return createMoney(match[1] === "-" ? -absolute : absolute, currency);
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) throw new DomainError("CURRENCY_MISMATCH", "Money currency mismatch");
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return createMoney(left.amountMinor - right.amountMinor, left.currency);
}

function divideRoundedHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new DomainError("INVALID_RATE_SCALE", "Rate scale must be positive");
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  let result = absolute / denominator;
  if ((absolute % denominator) * 2n >= denominator) result += 1n;
  return negative ? -result : result;
}

export function convertMoney(source: Money, targetCurrency: CurrencyCode, rateScaled: number, rateScale: number): Money {
  if (!Number.isSafeInteger(rateScaled) || rateScaled <= 0) throw new DomainError("INVALID_RATE", "Scaled rate must be a positive safe integer");
  if (!Number.isSafeInteger(rateScale) || rateScale <= 0) throw new DomainError("INVALID_RATE_SCALE", "Rate scale must be a positive safe integer");
  const sourceFactor = 10 ** currencyInfo(source.currency).minorDigits;
  const targetFactor = 10 ** currencyInfo(targetCurrency).minorDigits;
  const numerator = BigInt(source.amountMinor) * BigInt(rateScaled) * BigInt(targetFactor);
  const denominator = BigInt(rateScale) * BigInt(sourceFactor);
  const converted = divideRoundedHalfAwayFromZero(numerator, denominator);
  const asNumber = Number(converted);
  if (!Number.isSafeInteger(asNumber)) throw new DomainError("AMOUNT_OVERFLOW", "Converted amount exceeds safe integer range");
  return createMoney(asNumber, targetCurrency);
}
