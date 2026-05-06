import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePythConfig } from "../src/config";

const DEFAULT_BASE_URL = "https://hermes.pyth.network";

describe("resolvePythConfig", () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    // biome-ignore lint/performance/noDelete: process.env requires delete to truly unset vars (undefined assignment coerces to string "undefined")
    delete process.env.PYTH_BASE_URL;
    // biome-ignore lint/performance/noDelete: process.env requires delete to truly unset vars
    delete process.env.PYTH_TIMEOUT_MS;
    // biome-ignore lint/performance/noDelete: process.env requires delete to truly unset vars
    delete process.env.PYTH_RETRIES;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it("returns defaults when no context or env vars", () => {
    const config = resolvePythConfig();
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(config.timeoutMs).toBe(10_000);
    expect(config.retries).toBe(2);
  });

  it("reads from env vars", () => {
    process.env.PYTH_BASE_URL = "https://custom.pyth.network";
    process.env.PYTH_TIMEOUT_MS = "5000";
    process.env.PYTH_RETRIES = "1";

    const config = resolvePythConfig();
    expect(config.baseUrl).toBe("https://custom.pyth.network");
    expect(config.timeoutMs).toBe(5000);
    expect(config.retries).toBe(1);
  });

  it("reads pyth config from context.pyth (recommended pattern)", () => {
    const config = resolvePythConfig({
      pyth: { baseUrl: "https://ctx-direct.pyth.network", retries: 3 },
    });
    expect(config.baseUrl).toBe("https://ctx-direct.pyth.network");
    expect(config.retries).toBe(3);
    expect(config.timeoutMs).toBe(10_000);
  });

  it("reads pyth config from context.config.pyth (legacy pattern)", () => {
    const config = resolvePythConfig({
      config: { pyth: { timeoutMs: 3000 } },
    });
    expect(config.timeoutMs).toBe(3000);
  });

  it("reads pyth config from context.pluginConfig.pyth", () => {
    const config = resolvePythConfig({
      pluginConfig: { pyth: { retries: 0 } },
    });
    expect(config.retries).toBe(0);
  });

  it("context.pyth takes priority over env vars", () => {
    process.env.PYTH_BASE_URL = "https://env.pyth.network";

    const config = resolvePythConfig({
      pyth: { baseUrl: "https://override.pyth.network" },
    });
    expect(config.baseUrl).toBe("https://override.pyth.network");
  });

  it("falls back to defaults for invalid env var values", () => {
    process.env.PYTH_TIMEOUT_MS = "not-a-number";
    process.env.PYTH_RETRIES = "nan";

    const config = resolvePythConfig();
    expect(config.timeoutMs).toBe(10_000);
    expect(config.retries).toBe(2);
  });
});
