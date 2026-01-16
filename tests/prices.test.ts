import { describe, expect, it } from "vitest";
import { applyExponent, formatPythPrice, normalizeFeedId } from "../src/utils/prices";

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
});
