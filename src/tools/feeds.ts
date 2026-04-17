import type { Tool } from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";

const feedsInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Filter by symbol/base/quote (e.g., 'BTC', 'BTC/USD', 'Crypto.BTC/USD')"),
});

export const listPriceFeedsTool: Tool = {
  method: "pyth_list_price_feeds",
  name: "Pyth List Price Feeds",
  description: "List available Pyth price feeds, optionally filtered by query.",
  parameters: feedsInputSchema,
  execute: async (_client, context, params) => {
    const args = feedsInputSchema.parse(params);
    const config = resolvePythConfig(context);
    const api =
      (context as { pythClient?: ReturnType<typeof createPythClient> }).pythClient ??
      createPythClient(config);

    try {
      const feeds = await api.getPriceFeeds(args.query);
      return {
        success: true,
        count: feeds.length,
        feeds,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
