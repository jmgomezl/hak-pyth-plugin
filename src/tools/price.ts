import type { Tool } from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";
import type { PythPriceUpdateResponse } from "../types";
import { normalizeFeedId, normalizePriceUpdate } from "../utils/prices";

const latestPriceInputSchema = z
  .object({
    priceFeedId: z.string().optional().describe("Pyth price feed ID (hex)"),
    symbol: z.string().optional().describe("Feed symbol (e.g., 'Crypto.BTC/USD' or 'BTC/USD')"),
  })
  .refine((data) => data.priceFeedId || data.symbol, {
    message: "Provide priceFeedId or symbol.",
  });

const pickParsedUpdate = (response: PythPriceUpdateResponse, feedId: string) => {
  const parsed = response.parsed ?? [];
  const normalized = normalizeFeedId(feedId);
  return parsed.find((item) => normalizeFeedId(item.id) === normalized) ?? parsed[0] ?? null;
};

export const latestPriceTool: Tool = {
  method: "pyth_get_latest_price",
  name: "Pyth Get Latest Price",
  description: "Fetch the latest price update for a Pyth feed.",
  parameters: latestPriceInputSchema,
  execute: async (_client, context, params) => {
    const args = latestPriceInputSchema.parse(params);
    const config = resolvePythConfig(context);
    const api =
      (context as { pythClient?: ReturnType<typeof createPythClient> }).pythClient ??
      createPythClient(config);

    try {
      const feedId = args.priceFeedId ?? (await api.resolvePriceFeedId(args.symbol ?? ""));
      const response = await api.getLatestPriceUpdate(feedId);
      const parsedUpdate = pickParsedUpdate(response, feedId);
      const normalizedUpdate = normalizePriceUpdate(parsedUpdate);

      return {
        success: true,
        feedId,
        update: normalizedUpdate,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
