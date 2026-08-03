import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { PythClient } from "../src/api/client";

const feedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
const secondaryFeedId = "0x0000000000000000000000000000000000000000000000000000000000000001";

const feedList = [
  {
    id: feedId,
    attributes: {
      symbol: "Crypto.BTC/USD",
      base: "BTC",
      quote_currency: "USD",
      description: "BTC/USD",
    },
  },
];

const createClient = (retries = 0) => {
  const http = axios.create({
    baseURL: "https://example.test",
    timeout: 1_000,
  });
  const mock = new MockAdapter(http);
  const client = new PythClient({ http, retries });
  return { client, mock };
};

describe("PythClient", () => {
  it("resolves feed IDs from cached symbols", async () => {
    const { client, mock } = createClient();
    mock.onGet("/v2/price_feeds").reply(200, feedList);

    const fromSymbol = await client.resolvePriceFeedId("BTC/USD");
    const fromDescription = await client.resolvePriceFeedId("Crypto.BTC/USD");
    const fromHex = await client.resolvePriceFeedId(feedId);
    const fromUnknown = await client.resolvePriceFeedId("UNKNOWN");

    expect(fromSymbol).toBe(feedId);
    expect(fromDescription).toBe(feedId);
    expect(fromHex).toBe(feedId);
    expect(fromUnknown).toBe("UNKNOWN");
    expect(mock.history.get).toHaveLength(1);
  });

  it("passes query params when listing feeds", async () => {
    const { client, mock } = createClient();
    mock.onGet("/v2/price_feeds").reply((config) => {
      expect(config.params).toEqual({ query: "ETH" });
      return [200, []];
    });

    const feeds = await client.getPriceFeeds("ETH");
    expect(feeds).toEqual([]);
  });

  it("requests latest updates with feed IDs", async () => {
    const { client, mock } = createClient();
    const response = {
      parsed: [
        {
          id: feedId,
          price: {
            price: "12345",
            conf: "10",
            expo: -2,
          },
        },
      ],
    };

    mock.onGet("/v2/updates/price/latest").reply((config) => {
      expect(config.params?.ids).toEqual([feedId, secondaryFeedId]);
      return [200, response];
    });

    const updates = await client.getLatestPriceUpdates([feedId, secondaryFeedId]);
    expect(updates).toEqual(response);
  });

  it("retries on retryable errors", async () => {
    const { client, mock } = createClient(1);
    mock.onGet("/v2/price_feeds").replyOnce(500).onGet("/v2/price_feeds").replyOnce(200, feedList);

    const feeds = await client.getPriceFeeds();
    expect(feeds).toEqual(feedList);
    expect(mock.history.get).toHaveLength(2);
  });

  it("short-circuits latest updates for empty inputs", async () => {
    const { client, mock } = createClient();

    const updates = await client.getLatestPriceUpdates([]);

    expect(updates).toEqual({ parsed: [] });
    expect(mock.history.get).toHaveLength(0);
  });

  describe("Pyth Core upgrade (auth)", () => {
    it("sends the api key as a bearer token", async () => {
      const client = new PythClient({
        baseUrl: "https://example.test",
        apiKey: "pyth_test_key",
      });
      // biome-ignore lint/suspicious/noExplicitAny: reach into the private axios instance under test
      const http = (client as any).http;
      const mock = new MockAdapter(http);
      mock.onGet("/v2/price_feeds").reply(200, feedList);

      await client.getPriceFeeds();

      expect(http.defaults.baseURL).toBe("https://example.test");
      expect(mock.history.get?.[0]?.headers?.Authorization).toBe("Bearer pyth_test_key");
    });

    it("sends no Authorization header without an api key", async () => {
      const client = new PythClient({ baseUrl: "https://example.test" });
      // biome-ignore lint/suspicious/noExplicitAny: reach into the private axios instance under test
      const http = (client as any).http;
      const mock = new MockAdapter(http);
      mock.onGet("/v2/price_feeds").reply(200, feedList);

      await client.getPriceFeeds();

      expect(mock.history.get?.[0]?.headers?.Authorization).toBeUndefined();
    });

    it("turns a 401 into an actionable error and does not retry", async () => {
      const { client, mock } = createClient(2);
      mock.onGet("/v2/price_feeds").reply(401, "unauthorized");

      await expect(client.getPriceFeeds()).rejects.toThrow(/PYTH_API_KEY/);
      expect(mock.history.get).toHaveLength(1);
    });

    it("reports a rejected key differently from a missing one", async () => {
      const client = new PythClient({ baseUrl: "https://example.test", apiKey: "bad_key" });
      // biome-ignore lint/suspicious/noExplicitAny: reach into the private axios instance under test
      const http = (client as any).http;
      const mock = new MockAdapter(http);
      mock.onGet("/v2/price_feeds").reply(403, "forbidden");

      await expect(client.getPriceFeeds()).rejects.toThrow(/rejected the API key/);
    });
  });
});
