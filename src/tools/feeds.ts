import type { Tool } from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";

const MAX_FEEDS = 25;

const feedsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Filter by symbol/base/quote (e.g., 'BTC', 'BTC/USD', 'Crypto.BTC/USD'). Must be specific — broad queries are truncated to 25 results."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_FEEDS)
    .default(10)
    .describe(`Maximum number of feeds to return (1–${MAX_FEEDS}, default 10).`),
});

export const listPriceFeedsTool: Tool = {
  method: "pyth_list_price_feeds",
  name: "Pyth List Price Feeds",
  description: `List available Pyth price feeds filtered by query. Returns at most ${MAX_FEEDS} results. Use a specific query (e.g. 'BTC/USD') to find the exact feed you need.`,
  parameters: feedsInputSchema,
  execute: async (_client, context, params) => {
    const args = feedsInputSchema.parse(params);
    const config = resolvePythConfig(context);
    const api =
      (context as { pythClient?: ReturnType<typeof createPythClient> }).pythClient ??
      createPythClient(config);

    try {
      const feeds = await api.getPriceFeeds(args.query);
      const limited = feeds.slice(0, args.limit);
      return {
        success: true,
        total: feeds.length,
        returned: limited.length,
        feeds: limited.map((f) => ({
          id: f.id,
          symbol: f.attributes?.symbol ?? null,
          base: f.attributes?.base ?? null,
          quoteCurrency: f.attributes?.quote_currency ?? f.attributes?.quoteCurrency ?? null,
          assetType: f.attributes?.asset_type ?? null,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
