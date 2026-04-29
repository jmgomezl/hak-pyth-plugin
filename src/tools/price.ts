import { BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import type { Client } from "@hiero-ledger/sdk";
import { z } from "zod";
import { createPythClient } from "../api/client";
import { resolvePythConfig } from "../config";
import type { PythPriceUpdateResponse } from "../types";
import { normalizeFeedId, normalizePriceUpdate } from "../utils/prices";

const latestPriceParametersSchema = z.object({
  priceFeedId: z.string().optional().describe("Pyth price feed ID (hex)"),
  symbol: z.string().optional().describe("Feed symbol (e.g., 'Crypto.BTC/USD' or 'BTC/USD')"),
});

const latestPriceInputSchema = latestPriceParametersSchema.refine(
  (data) => data.priceFeedId || data.symbol,
  { message: "Provide priceFeedId or symbol." },
);

type LatestPriceInput = z.infer<typeof latestPriceInputSchema>;

const pickParsedUpdate = (response: PythPriceUpdateResponse, feedId: string) => {
  const parsed = response.parsed ?? [];
  const normalized = normalizeFeedId(feedId);
  return parsed.find((item) => normalizeFeedId(item.id) === normalized) ?? parsed[0] ?? null;
};

export class LatestPriceTool extends BaseTool<LatestPriceInput, LatestPriceInput> {
  method = "pyth_get_latest_price";
  name = "Pyth Get Latest Price";
  description = "Fetch the latest price update for a Pyth feed.";
  parameters = latestPriceParametersSchema;

  async normalizeParams(
    params: LatestPriceInput,
    _context: Context,
    _client: Client,
  ): Promise<LatestPriceInput> {
    return latestPriceInputSchema.parse(params);
  }

  async coreAction(args: LatestPriceInput, context: Context, _client: Client) {
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
  }

  override async shouldSecondaryAction(_coreActionResult: unknown, _context: Context) {
    return false;
  }

  async secondaryAction(_request: unknown, _client: Client, _context: Context) {
    return null;
  }
}

export const latestPriceTool = new LatestPriceTool();
