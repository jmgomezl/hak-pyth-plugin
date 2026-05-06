/**
 * Vercel AI SDK agent example using hak-pyth-plugin.
 *
 * Prerequisites:
 *   npm install @hashgraph/hedera-agent-kit @hashgraph/hedera-agent-kit-vercel-ai
 *              ai @ai-sdk/openai
 *
 * Required env vars:
 *   OPENAI_API_KEY, HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY
 */

import { openai } from "@ai-sdk/openai";
import { AgentMode, HederaAgentAPI } from "@hashgraph/hedera-agent-kit";
import { HederaVercelAIToolkit } from "@hashgraph/hedera-agent-kit-vercel-ai";
import { generateText } from "ai";
import { pythPlugin } from "hak-pyth-plugin";

async function main() {
  const client = new HederaAgentAPI(
    process.env.HEDERA_ACCOUNT_ID ?? "",
    process.env.HEDERA_PRIVATE_KEY ?? "",
    "testnet",
  );

  const toolkit = new HederaVercelAIToolkit({
    client,
    configuration: {
      plugins: [pythPlugin],
      context: {
        mode: AgentMode.AUTONOMOUS,
        pyth: {
          baseUrl: process.env.PYTH_BASE_URL ?? "https://hermes.pyth.network",
        },
      },
    },
  });

  const tools = toolkit.getTools();

  const prompts = [
    "What BTC/USD price feeds are available on Pyth?",
    "What is the current price of ETH/USD?",
    "Get me the latest prices for BTC/USD and SOL/USD.",
  ];

  for (const prompt of prompts) {
    console.log(`\nUser: ${prompt}`);
    const { text } = await generateText({
      model: openai("gpt-4o"),
      tools,
      maxSteps: 5,
      prompt,
    });
    console.log(`Agent: ${text}`);
  }
}

main().catch(console.error);
