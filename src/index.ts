import type { Plugin } from "@hashgraph/hedera-agent-kit";
import { listPriceFeedsTool } from "./tools/feeds";
import { latestPriceTool } from "./tools/price";
import { latestPricesTool } from "./tools/prices";

export const pythPlugin: Plugin = {
  name: "pyth",
  description: "Integration with Pyth Network for price feed lookups.",
  tools: () => [listPriceFeedsTool, latestPriceTool, latestPricesTool],
};

export const pythPluginToolNames = {
  PYTH_LIST_PRICE_FEEDS_TOOL: listPriceFeedsTool.method,
  PYTH_GET_LATEST_PRICE_TOOL: latestPriceTool.method,
  PYTH_GET_LATEST_PRICES_TOOL: latestPricesTool.method,
} as const;

export { pythPlugin as default };
