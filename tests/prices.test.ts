import { describe, expect, it } from "vitest";
import {
  applyExponent,
  formatPythPrice,
  normalizeFeedId,
  normalizePriceUpdate,
} from "../src/utils/prices";

describe("normalizeFeedId", () => {
  it("normalizes hex feed ids", () => {
    expect(normalizeFeedId("0xAbC123")).toBe("abc123");
    expect(normalizeFeedId("abc123")).toBe("abc123");
  });
});

describe("applyExponent", () => {
  it("formats negative exponents", () => {
    expect(applyExponent("12345", -2)).toBe("123.45");
    expect(applyExponent("1", -4)).toBe("0.0001");
  });

  it("formats positive exponents", () => {
    expect(applyExponent("123", 2)).toBe("12300");
    expect(applyExponent("-5", 3)).toBe("-5000");
  });
});

describe("formatPythPrice", () => {
  it("formats a pyth price object", () => {
    const formatted = formatPythPrice({ price: "123456", conf: "1", expo: -4 });
    expect(formatted).toBe("12.3456");
  });

  it("returns null for null input", () => {
    expect(formatPythPrice(null)).toBeNull();
    expect(formatPythPrice(undefined)).toBeNull();
  });
});

describe("normalizePriceUpdate", () => {
  const feedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

  it("returns null for null or undefined input", () => {
    expect(normalizePriceUpdate(null)).toBeNull();
    expect(normalizePriceUpdate(undefined)).toBeNull();
  });

  it("normalizes a full price update", () => {
    const result = normalizePriceUpdate({
      id: feedId,
      price: { price: "9900000", conf: "5000", expo: -5, publish_time: 1700000000 },
      ema_price: { price: "9800000", conf: "4000", expo: -5 },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(feedId);
    expect(result?.formattedPrice).toBe("99");
    expect(result?.formattedEmaPrice).toBe("98");
    expect(result?.publishTime).toBe(1700000000);
  });

  it("uses emaPrice when ema_price is absent", () => {
    const result = normalizePriceUpdate({
      id: feedId,
      emaPrice: { price: "500", conf: "1", expo: -2 },
    });

    expect(result?.formattedEmaPrice).toBe("5");
    expect(result?.price).toBeNull();
  });

  it("returns null formattedPrice when price is missing", () => {
    const result = normalizePriceUpdate({ id: feedId });
    expect(result?.formattedPrice).toBeNull();
    expect(result?.publishTime).toBeNull();
  });
});
