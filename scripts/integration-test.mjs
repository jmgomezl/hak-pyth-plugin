import axios from "axios";

const baseUrl = process.env.PYTH_BASE_URL ?? "https://hermes.pyth.network";
const query = process.env.PYTH_TEST_QUERY ?? "BTC";
const feedIdOverride = process.env.PYTH_TEST_FEED_ID;

const client = axios.create({
  baseURL: baseUrl,
  timeout: 10_000,
});

const feedsResponse = await client.get("/v2/price_feeds", {
  params: query ? { query } : undefined,
});

const feeds = Array.isArray(feedsResponse.data) ? feedsResponse.data : [];
const selectedId = feedIdOverride ?? feeds[0]?.id;

if (!selectedId) {
  console.error("No price feed found. Set PYTH_TEST_FEED_ID or PYTH_TEST_QUERY.");
  process.exit(1);
}

const priceResponse = await client.get("/v2/updates/price/latest", {
  params: { ids: [selectedId] },
});

const parsed = priceResponse.data?.parsed ?? [];

console.log(`Fetched ${feeds.length} feeds from ${baseUrl}`);
console.log(`Latest updates returned: ${parsed.length}`);
console.log(JSON.stringify(parsed[0] ?? priceResponse.data, null, 2));
