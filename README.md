# Hedera Agent Kit - Pyth Plugin

A Hedera Agent Kit plugin that exposes Pyth Network price feeds via the Hermes API. Use it to pull
real-time market data (crypto, FX, equities, commodities) with simple tool calls.

## Overview

This plugin registers Pyth tools for:

- Discovering price feeds by symbol or description
- Fetching the latest price for a feed by ID or symbol
- Fetching latest prices for multiple feeds in one request

All tools return a `{ success: boolean, ... }` payload so agents can reason about failures
consistently.

## Installation

```bash
npm install hak-pyth-plugin
```

## Quick Start (Agent)

```ts
import { HederaAgent } from "hedera-agent-kit";
import { pythPlugin } from "hak-pyth-plugin";

const agent = new HederaAgent({
  plugins: [pythPlugin]
});
```

## Configuration

Defaults:

- `PYTH_BASE_URL` (default: `https://hermes.pyth.network`)
- `PYTH_TIMEOUT_MS` (default: `10000`)
- `PYTH_RETRIES` (default: `2`)

You can override in code:

```ts
const agent = new HederaAgent({
  plugins: [pythPlugin],
  config: {
    pyth: {
      baseUrl: "https://hermes.pyth.network",
      timeoutMs: 10000,
      retries: 2
    }
  }
});
```

## Tool Catalog

| Method | Description | Parameters |
| --- | --- | --- |
| `pyth_list_price_feeds` | List/search feeds | `query?` (symbol/base/quote filter) |
| `pyth_get_latest_price` | Latest price for one feed | `priceFeedId?`, `symbol?` |
| `pyth_get_latest_prices` | Latest prices for many feeds | `priceFeedIds?`, `symbols?` |

## Usage Examples

List feeds by query:

```ts
const tools = pythPlugin.tools({});
const listTool = tools.find((tool) => tool.method === "pyth_list_price_feeds");
const result = await listTool?.execute(null, {}, { query: "BTC" });

if (result?.success) {
  console.log(result.count, result.feeds[0]);
}
```

Get latest price by symbol:

```ts
const priceTool = tools.find((tool) => tool.method === "pyth_get_latest_price");
const result = await priceTool?.execute(null, {}, { symbol: "BTC/USD" });

if (result?.success) {
  console.log(result.update?.formattedPrice, result.update?.publishTime);
}
```

Batch latest prices:

```ts
const pricesTool = tools.find((tool) => tool.method === "pyth_get_latest_prices");
const result = await pricesTool?.execute(null, {}, { symbols: ["BTC/USD", "ETH/USD"] });

if (result?.success) {
  console.log(result.updates.map((update) => update.formattedPrice));
}
```

### Example Script (Local)

Build first, then run the demo script:

```bash
npm run build
npm run example
```

Optional overrides:

```bash
export PYTH_EXAMPLE_QUERY=BTC
export PYTH_EXAMPLE_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
```

## Response Shape Notes

- `update.formattedPrice` applies the Pyth exponent for human-readable output.
- `update.publishTime` is an epoch timestamp (seconds).
- On failure, tools return `{ success: false, error }`.

## Integration Smoke Test

```bash
npm run test:integration
```

Optional env overrides:

```bash
export PYTH_BASE_URL=https://hermes.pyth.network
export PYTH_TEST_QUERY=BTC
export PYTH_TEST_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
```

## Development

```bash
npm run build
npm run test
npm run lint
```

## License

MIT
