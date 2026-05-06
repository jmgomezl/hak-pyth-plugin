import { describe, expect, it, vi } from "vitest";
import { ListPriceFeedsTool } from "../src/tools/feeds";
import { LatestPriceTool } from "../src/tools/price";
import { LatestPricesTool } from "../src/tools/prices";

const feedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
const ethFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0aff";

const makeFeed = (id: string, symbol: string) => ({
  id,
  attributes: { symbol, base: symbol.split("/")[0], quote_currency: "USD" },
});

const makeParsedUpdate = (id: string, price = "9900000", expo = -5) => ({
  id,
  price: { price, conf: "5000", expo, publish_time: 1700000000 },
  ema_price: { price, conf: "4000", expo },
});

const makeClient = (overrides: Record<string, unknown> = {}) => ({
  getPriceFeeds: vi.fn().mockResolvedValue([makeFeed(feedId, "Crypto.BTC/USD")]),
  resolvePriceFeedId: vi.fn().mockResolvedValue(feedId),
  getLatestPriceUpdates: vi.fn().mockResolvedValue({
    parsed: [makeParsedUpdate(feedId)],
  }),
  getLatestPriceUpdate: vi.fn().mockResolvedValue({
    parsed: [makeParsedUpdate(feedId)],
  }),
  ...overrides,
});

describe("pyth_list_price_feeds", () => {
  const tool = new ListPriceFeedsTool();

  it("returns feeds from the client", async () => {
    const client = makeClient();
    const result = await tool.coreAction({ query: "BTC", limit: 10 }, { pythClient: client }, null);

    expect(result.success).toBe(true);
    expect(result.feeds).toHaveLength(1);
    expect(result.returned).toBe(1);
    expect(client.getPriceFeeds).toHaveBeenCalledWith("BTC");
  });

  it("respects the limit parameter", async () => {
    const manyFeeds = Array.from({ length: 20 }, (_, i) =>
      makeFeed(`0x${String(i).padStart(64, "0")}`, `Feed/${i}`),
    );
    const client = makeClient({ getPriceFeeds: vi.fn().mockResolvedValue(manyFeeds) });

    const result = await tool.coreAction({ query: "Feed", limit: 5 }, { pythClient: client }, null);

    expect(result.success).toBe(true);
    expect(result.returned).toBe(5);
    expect(result.total).toBe(20);
  });

  it("returns success:false on client error", async () => {
    const client = makeClient({
      getPriceFeeds: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const result = await tool.coreAction({ query: "BTC", limit: 10 }, { pythClient: client }, null);

    expect(result.success).toBe(false);
    expect(result.error).toBe("network error");
  });
});

describe("pyth_get_latest_price", () => {
  const tool = new LatestPriceTool();

  it("fetches price by feed ID", async () => {
    const client = makeClient();
    const result = await tool.coreAction({ priceFeedId: feedId }, { pythClient: client }, null);

    expect(result.success).toBe(true);
    expect(result.feedId).toBe(feedId);
    expect(result.update?.formattedPrice).toBe("99");
    expect(client.resolvePriceFeedId).not.toHaveBeenCalled();
  });

  it("resolves symbol to feed ID when no priceFeedId given", async () => {
    const client = makeClient();
    const result = await tool.coreAction({ symbol: "BTC/USD" }, { pythClient: client }, null);

    expect(result.success).toBe(true);
    expect(client.resolvePriceFeedId).toHaveBeenCalledWith("BTC/USD");
  });

  it("returns success:false on error", async () => {
    const client = makeClient({
      getLatestPriceUpdate: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const result = await tool.coreAction({ priceFeedId: feedId }, { pythClient: client }, null);

    expect(result.success).toBe(false);
    expect(result.error).toBe("timeout");
  });
});

describe("pyth_get_latest_prices", () => {
  const tool = new LatestPricesTool();

  it("fetches prices for multiple feed IDs", async () => {
    const client = makeClient({
      getLatestPriceUpdates: vi.fn().mockResolvedValue({
        parsed: [makeParsedUpdate(feedId), makeParsedUpdate(ethFeedId)],
      }),
    });
    const result = await tool.coreAction(
      { priceFeedIds: [feedId, ethFeedId] },
      { pythClient: client },
      null,
    );

    expect(result.success).toBe(true);
    expect(result.updates).toHaveLength(2);
    expect(result.missingFeedIds).toHaveLength(0);
  });

  it("resolves symbols and deduplicates IDs", async () => {
    const client = makeClient({
      resolvePriceFeedId: vi.fn().mockResolvedValue(feedId),
    });
    const result = await tool.coreAction(
      { symbols: ["BTC/USD", "BTC/USD"] },
      { pythClient: client },
      null,
    );

    expect(result.success).toBe(true);
    expect(result.feedIds).toHaveLength(1);
  });

  it("reports missing feeds when response omits them", async () => {
    const client = makeClient({
      getLatestPriceUpdates: vi.fn().mockResolvedValue({ parsed: [] }),
    });
    const result = await tool.coreAction({ priceFeedIds: [feedId] }, { pythClient: client }, null);

    expect(result.success).toBe(true);
    expect(result.missingFeedIds).toContain(feedId);
    expect(result.updates).toHaveLength(0);
  });

  it("returns success:false on error", async () => {
    const client = makeClient({
      getLatestPriceUpdates: vi.fn().mockRejectedValue(new Error("bad request")),
    });
    const result = await tool.coreAction({ priceFeedIds: [feedId] }, { pythClient: client }, null);

    expect(result.success).toBe(false);
    expect(result.error).toBe("bad request");
  });
});
