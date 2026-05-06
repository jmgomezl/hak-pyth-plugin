/**
 * LangChain agent example using hak-pyth-plugin.
 *
 * Prerequisites:
 *   npm install @hashgraph/hedera-agent-kit @hashgraph/hedera-agent-kit-langchain
 *              langchain @langchain/openai @langchain/langgraph
 *
 * Required env vars:
 *   OPENAI_API_KEY, HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY
 */

import { AgentMode, HederaAgentAPI } from "@hashgraph/hedera-agent-kit";
import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { pythPlugin } from "hak-pyth-plugin";

async function main() {
  const client = new HederaAgentAPI(
    process.env.HEDERA_ACCOUNT_ID ?? "",
    process.env.HEDERA_PRIVATE_KEY ?? "",
    "testnet",
  );

  const toolkit = new HederaLangchainToolkit({
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
  const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
  const memory = new MemorySaver();

  const agent = createReactAgent({ llm, tools, checkpointSaver: memory });

  const prompts = [
    "What BTC/USD price feeds are available on Pyth?",
    "What is the current price of ETH/USD?",
    "Get me the latest prices for BTC/USD and SOL/USD.",
  ];

  for (const prompt of prompts) {
    console.log(`\nUser: ${prompt}`);
    const result = await agent.invoke(
      { messages: [{ role: "user", content: prompt }] },
      { configurable: { thread_id: "pyth-demo" } },
    );
    const last = result.messages.at(-1);
    console.log(
      `Agent: ${typeof last?.content === "string" ? last.content : JSON.stringify(last?.content)}`,
    );
  }
}

main().catch(console.error);
