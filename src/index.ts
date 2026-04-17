import type { Plugin } from "@hashgraph/hedera-agent-kit";
import { listPriceFeedsTool } from "./tools/feeds";
import { latestPriceTool } from "./tools/price";
import { latestPricesTool } from "./tools/prices";

export const pythPlugin: Plugin = {
  name: "pyth",
  description: "Integration with Pyth Network for price feed lookups.",
  tools: () => [listPriceFeedsTool, latestPriceTool, latestPricesTool],
};

export { pythPlugin as default };
