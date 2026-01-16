import type { PythParsedPriceUpdate, PythPrice } from "../types";

export const normalizeFeedId = (value: string): string => {
  return value.trim().toLowerCase().replace(/^0x/, "");
};

const isIntegerString = (value: string): boolean => /^-?\d+$/.test(value);

export const applyExponent = (value: string, expo: number): string => {
  const trimmed = value.trim();
  if (!isIntegerString(trimmed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  const negative = trimmed.startsWith("-");
  const digits = negative ? trimmed.slice(1) : trimmed;

  if (expo === 0) {
    return trimmed;
  }

  if (expo > 0) {
    const expanded = `${digits}${"0".repeat(expo)}`;
    return negative ? `-${expanded}` : expanded;
  }

  const decimals = Math.abs(expo);
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  const formatted = fraction.length > 0 ? `${whole}.${fraction}` : whole;

  return negative ? `-${formatted}` : formatted;
};

const toIntegerString = (value: string | number): string | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return Math.trunc(value).toString();
  }
  return isIntegerString(value) ? value : null;
};

const toNumber = (value: string | number | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const formatPythPrice = (price: PythPrice | null | undefined): string | null => {
  if (!price) {
    return null;
  }
  const raw = toIntegerString(price.price);
  if (!raw) {
    return null;
  }
  const expo = toNumber(price.expo);
  if (expo === null) {
    return null;
  }
  try {
    return applyExponent(raw, expo);
  } catch {
    return null;
  }
};

export interface NormalizedPriceUpdate {
  id: string;
  price: PythPrice | null;
  emaPrice: PythPrice | null;
  formattedPrice: string | null;
  formattedEmaPrice: string | null;
  publishTime: number | null;
}

export const normalizePriceUpdate = (
  update: PythParsedPriceUpdate | null | undefined,
): NormalizedPriceUpdate | null => {
  if (!update) {
    return null;
  }
  const price = update.price ?? null;
  const emaPrice = update.ema_price ?? update.emaPrice ?? null;
  const publishTime = price?.publishTime ?? price?.publish_time ?? null;

  return {
    id: update.id,
    price,
    emaPrice,
    formattedPrice: formatPythPrice(price),
    formattedEmaPrice: formatPythPrice(emaPrice),
    publishTime,
  };
};
