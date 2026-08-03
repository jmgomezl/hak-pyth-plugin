# Hedera Agent Kit - Pyth Plugin

A Hedera Agent Kit plugin that exposes Pyth Network price feeds via the Hermes API. Use it to pull
real-time market data (crypto, FX, equities, commodities) with simple tool calls.

> ### ⚠️ Action required before 2026-08-18 — Pyth Core upgrade
>
> Pyth Core is being upgraded under [OP-PIP-100](https://forum.pyth.network/t/passed-op-pip-100-pyth-core-to-pyth-pro-migration/2420).
> **From August 18, 2026, Hermes requires an API key.** Anonymous requests to price-update routes
> will stop working.
>
> **To upgrade:** get a key from
> [Pyth Terminal](https://docs.pyth.network/price-feeds/pro/acquire-api-key) (requires a Starter or
> Pro data plan), then set `PYTH_API_KEY`. That is the only change needed — the plugin switches to
> the upgraded endpoint (`https://pyth.dourolabs.app/hermes`) automatically.
>
> Without a key the plugin keeps using `https://hermes.pyth.network`, which works until the upgrade
> date. Tracked in [issue #3](https://github.com/jmgomezl/hak-pyth-plugin/issues/3).

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
import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";
import { pythPlugin } from "hak-pyth-plugin";

const hederaAgentToolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: [pythPlugin],
  },
});

const tools = hederaAgentToolkit.getTools();
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `PYTH_API_KEY` | _(none)_ | Sent as `Authorization: Bearer <key>`. Required from 2026-08-18. |
| `PYTH_BASE_URL` | see below | Overrides the endpoint chosen automatically. |
| `PYTH_TIMEOUT_MS` | `10000` | Request timeout. |
| `PYTH_RETRIES` | `2` | Retries on transient errors (429/5xx). Auth failures never retry. |

**How the endpoint is chosen.** An explicit `PYTH_BASE_URL` (or `context.pyth.baseUrl`) always
wins. Otherwise the API key decides:

| `PYTH_API_KEY` | Endpoint used |
|---|---|
| not set | `https://hermes.pyth.network` — legacy, works until 2026-08-18 |
| set | `https://pyth.dourolabs.app/hermes` — upgraded, authenticated |

This pairing is deliberate: the upgraded endpoint rejects anonymous price-update requests, and the
legacy endpoint ignores the key, so neither combination can be silently wrong.

You can override in code by passing a `pyth` key inside `context`:

```ts
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";

const hederaAgentToolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: [pythPlugin],
    context: {
      mode: AgentMode.AUTONOMOUS,
      pyth: {
        apiKey: process.env.PYTH_API_KEY,
        timeoutMs: 10000,
        retries: 2,
      },
    },
  },
});
```

## Tool Catalog

| Method | Description | Parameters |
| --- | --- | --- |
| `pyth_list_price_feeds` | List/search feeds | `query?` (symbol/base/quote filter), `limit?` (1–25, default 10) |
| `pyth_get_latest_price` | Latest price for one feed | `priceFeedId?`, `symbol?` |
| `pyth_get_latest_prices` | Latest prices for many feeds | `priceFeedIds?`, `symbols?` |

> **Token context warning:** Querying `pyth_list_price_feeds` without a `query` filter can return
> thousands of feeds and exhaust the LLM context window. Always pass a focused `query` (e.g. `"BTC"`,
> `"ETH/USD"`) and rely on the default `limit` of 10 results. Avoid broad queries like
> "show me all available price feeds".

## LLM Prompt Examples

Once the plugin is registered with your agent, you can interact with it using natural language:

```
"What BTC/USD price feeds are available on Pyth?"
"What is the current price of ETH in USD?"
"Get me the latest prices for BTC/USD and SOL/USD."
"Find Pyth feeds for gold (XAU)."
"What is the EUR/USD exchange rate right now?"
```

See the [`examples/`](./examples) directory for fully-wired LangChain and Vercel AI agent scripts.

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
export PYTH_API_KEY=your_key_here   # exercises the upgraded endpoint
export PYTH_TEST_QUERY=BTC
export PYTH_TEST_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
```

## Development

```bash
npm run build
npm run test
npm run lint
```

## Resources

- [Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit-js)
- [Hedera AI Agent Kit Docs](https://docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/hedera-ai-agent-kit)
- [Pyth Hermes API Docs](https://docs.pyth.network/price-feeds/api-reference/hermes)

## License

MIT
