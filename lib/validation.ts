import { isKnownCurrency } from "@/data/currencies";

export function isValidSriLankanNic(value: string) {
  return /^(?:\d{9}[VX]|\d{12})$/.test(value.trim().toUpperCase());
}

export function isValidPassport(value: string) {
  return /^[A-Z0-9]{5,20}$/i.test(value.trim());
}

export function parsePositiveAmount(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

export function allowedCurrency(value: string) {
  return isKnownCurrency(value.trim().toUpperCase());
}
