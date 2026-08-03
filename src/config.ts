import type { PythConfig } from "./types";

/**
 * Legacy unauthenticated Hermes endpoint.
 * Serves traffic without an API key until the Pyth Core upgrade on 2026-08-18.
 */
export const LEGACY_BASE_URL = "https://hermes.pyth.network";

/**
 * Upgraded Hermes endpoint (Pyth Core upgrade, OP-PIP-100).
 * Requires `Authorization: Bearer <apiKey>` on price-update routes.
 */
export const UPGRADED_BASE_URL = "https://pyth.dourolabs.app/hermes";

const DEFAULT_CONFIG = {
  timeoutMs: 10_000,
  retries: 2,
} as const;

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimmed = (value: string | undefined): string | undefined => {
  const result = value?.trim();
  return result ? result : undefined;
};

const readContextConfig = (context: unknown): Partial<PythConfig> => {
  if (!context || typeof context !== "object") {
    return {};
  }
  const ctx = context as {
    pyth?: Partial<PythConfig>;
    config?: { pyth?: Partial<PythConfig> };
    pluginConfig?: { pyth?: Partial<PythConfig> };
  };
  return {
    ...(ctx.pluginConfig?.pyth ?? {}),
    ...(ctx.config?.pyth ?? {}),
    ...(ctx.pyth ?? {}),
  };
};

export const resolvePythConfig = (context?: unknown): PythConfig => {
  const ctxConfig = readContextConfig(context);

  const apiKey = trimmed(ctxConfig.apiKey) ?? trimmed(process.env.PYTH_API_KEY);

  // An explicit baseUrl always wins. Otherwise the key picks the infrastructure:
  // the upgraded endpoint rejects anonymous price-update requests, and the
  // legacy endpoint ignores the key, so defaulting on presence is safe both ways.
  const explicitBaseUrl = trimmed(ctxConfig.baseUrl) ?? trimmed(process.env.PYTH_BASE_URL);
  const baseUrl = explicitBaseUrl ?? (apiKey ? UPGRADED_BASE_URL : LEGACY_BASE_URL);

  return {
    baseUrl,
    timeoutMs:
      ctxConfig.timeoutMs ?? toNumber(process.env.PYTH_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs),
    retries: ctxConfig.retries ?? toNumber(process.env.PYTH_RETRIES, DEFAULT_CONFIG.retries),
    ...(apiKey ? { apiKey } : {}),
  };
};
