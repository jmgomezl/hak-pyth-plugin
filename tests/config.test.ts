import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LEGACY_BASE_URL, UPGRADED_BASE_URL, resolvePythConfig } from "../src/config";

const DEFAULT_BASE_URL = LEGACY_BASE_URL;

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
    // biome-ignore lint/performance/noDelete: process.env requires delete to truly unset vars
    delete process.env.PYTH_API_KEY;
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

  describe("Pyth Core upgrade (auth + endpoint selection)", () => {
    it("stays on the legacy endpoint with no api key", () => {
      const config = resolvePythConfig();
      expect(config.baseUrl).toBe(LEGACY_BASE_URL);
      expect(config.apiKey).toBeUndefined();
    });

    it("switches to the upgraded endpoint when PYTH_API_KEY is set", () => {
      process.env.PYTH_API_KEY = "pyth_test_key";

      const config = resolvePythConfig();
      expect(config.baseUrl).toBe(UPGRADED_BASE_URL);
      expect(config.apiKey).toBe("pyth_test_key");
    });

    it("switches to the upgraded endpoint for a context api key", () => {
      const config = resolvePythConfig({ pyth: { apiKey: "ctx_key" } });
      expect(config.baseUrl).toBe(UPGRADED_BASE_URL);
      expect(config.apiKey).toBe("ctx_key");
    });

    it("context api key takes priority over env", () => {
      process.env.PYTH_API_KEY = "env_key";

      const config = resolvePythConfig({ pyth: { apiKey: "ctx_key" } });
      expect(config.apiKey).toBe("ctx_key");
    });

    it("an explicit baseUrl wins over the api-key default", () => {
      process.env.PYTH_API_KEY = "pyth_test_key";
      process.env.PYTH_BASE_URL = "https://self-hosted.example.com";

      const config = resolvePythConfig();
      expect(config.baseUrl).toBe("https://self-hosted.example.com");
      expect(config.apiKey).toBe("pyth_test_key");
    });

    it("treats a blank api key as absent", () => {
      process.env.PYTH_API_KEY = "   ";

      const config = resolvePythConfig();
      expect(config.apiKey).toBeUndefined();
      expect(config.baseUrl).toBe(LEGACY_BASE_URL);
    });
  });
});
