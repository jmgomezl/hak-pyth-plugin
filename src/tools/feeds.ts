import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";

const MAX_FEEDS = 25;

const feedsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Filter by symbol/base/quote (e.g., 'BTC', 'BTC/USD', 'Crypto.BTC/USD'). Must be specific — broad queries are truncated to 25 results.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_FEEDS)
    .default(10)
    .describe(`Maximum number of feeds to return (1–${MAX_FEEDS}, default 10).`),
});

type FeedsInput = z.infer<typeof feedsInputSchema>;

export class ListPriceFeedsTool extends BaseTool<FeedsInput, FeedsInput> {
  method = "pyth_list_price_feeds";
  name = "Pyth List Price Feeds";
  description = `List available Pyth price feeds filtered by query. Returns at most ${MAX_FEEDS} results. Use a specific query (e.g. 'BTC/USD') to find the exact feed you need.`;
  parameters = feedsInputSchema;

  async normalizeParams(
    params: FeedsInput,
    _context: Context,
    _client: Client,
  ): Promise<FeedsInput> {
    return feedsInputSchema.parse(params);
  }

  async coreAction(args: FeedsInput, context: Context, _client: Client) {
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
  }

  override async shouldSecondaryAction(_coreActionResult: unknown, _context: Context) {
    return false;
  }

  async secondaryAction(_request: unknown, _client: Client, _context: Context) {
    return null;
  }
}

export const listPriceFeedsTool = new ListPriceFeedsTool();
