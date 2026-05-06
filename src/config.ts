import type { PythConfig } from "./types";

const DEFAULT_CONFIG: PythConfig = {
  baseUrl: "https://hermes.pyth.network",
  timeoutMs: 10_000,
  retries: 2,
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  return {
    ...DEFAULT_CONFIG,
    ...ctxConfig,
    baseUrl: ctxConfig.baseUrl ?? process.env.PYTH_BASE_URL ?? DEFAULT_CONFIG.baseUrl,
    timeoutMs:
      ctxConfig.timeoutMs ?? toNumber(process.env.PYTH_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs),
    retries: ctxConfig.retries ?? toNumber(process.env.PYTH_RETRIES, DEFAULT_CONFIG.retries),
  };
};
