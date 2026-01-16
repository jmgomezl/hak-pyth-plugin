import { pythPlugin } from "../dist/index.js";

const query = process.env.PYTH_EXAMPLE_QUERY ?? "BTC";
const feedIdOverride = process.env.PYTH_EXAMPLE_FEED_ID;

const tools = pythPlugin.tools({});
const listTool = tools.find((tool) => tool.method === "pyth_list_price_feeds");
const priceTool = tools.find((tool) => tool.method === "pyth_get_latest_price");

if (!listTool || !priceTool) {
  throw new Error("Pyth tools were not registered.");
}

const feedList = await listTool.execute(null, {}, { query });
if (!feedList.success) {
  throw new Error(feedList.error ?? "Unable to fetch price feeds.");
}

const feedId = feedIdOverride ?? feedList.feeds?.[0]?.id;
if (!feedId) {
  throw new Error("No feed ID available. Set PYTH_EXAMPLE_FEED_ID or refine the query.");
}

const latest = await priceTool.execute(null, {}, { priceFeedId: feedId });
if (!latest.success) {
  throw new Error(latest.error ?? "Unable to fetch latest price.");
}

console.log(JSON.stringify({ query, feedId, latest }, null, 2));
