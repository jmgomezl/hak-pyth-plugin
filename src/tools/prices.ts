import type { Tool } from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";
import { type NormalizedPriceUpdate, normalizeFeedId, normalizePriceUpdate } from "../utils/prices";

const latestPricesInputSchema = z
  .object({
    priceFeedIds: z.array(z.string()).optional().describe("Array of Pyth feed IDs"),
    symbols: z.array(z.string()).optional().describe("Array of feed symbols"),
  })
  .refine((data) => (data.priceFeedIds?.length ?? 0) > 0 || (data.symbols?.length ?? 0) > 0, {
    message: "Provide priceFeedIds or symbols.",
  });

const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const latestPricesTool: Tool = {
  method: "pyth_get_latest_prices",
  name: "Pyth Get Latest Prices",
  description: "Fetch latest price updates for multiple Pyth feeds.",
  parameters: latestPricesInputSchema,
  execute: async (_client, context, params) => {
    const args = latestPricesInputSchema.parse(params);
    const config = resolvePythConfig(context);
    const api =
      (context as { pythClient?: ReturnType<typeof createPythClient> }).pythClient ??
      createPythClient(config);

    try {
      const ids: string[] = [];
      if (args.priceFeedIds) {
        ids.push(...args.priceFeedIds);
      }
      if (args.symbols) {
        for (const symbol of args.symbols) {
          const resolved = await api.resolvePriceFeedId(symbol);
          ids.push(resolved);
        }
      }

      const feedIds = uniqueIds(ids);
      const response = await api.getLatestPriceUpdates(feedIds);
      const parsed = response.parsed ?? [];
      const normalized = parsed
        .map((update) => normalizePriceUpdate(update))
        .filter((item): item is NormalizedPriceUpdate => item !== null);
      const normalizedMap = new Map(normalized.map((item) => [normalizeFeedId(item.id), item]));
      const missingFeedIds = feedIds.filter((id) => !normalizedMap.has(normalizeFeedId(id)));

      return {
        success: true,
        feedIds,
        missingFeedIds,
        updates: normalized,
        raw: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
