import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  env.SERPER_API_KEY = "test-key";
  return env;
}

test("stdio server lists both tools and renders a prompt", { timeout: 15_000 }, async () => {
  const serverPath = fileURLToPath(new URL("./index.js", import.meta.url));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: childEnv(),
  });
  const client = new Client({ name: "serpermcp-test", version: "1.0.0" });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name).sort(),
      ["google_search", "scrape"],
    );
    const prompts = await client.listPrompts();
    assert.deepEqual(
      prompts.prompts.map((prompt) => prompt.name).sort(),
      ["compare-sources", "fact-check", "research-topic", "technical-search"],
    );
    const research = await client.getPrompt({
      name: "research-topic",
      arguments: { topic: "固态电池" },
    });
    assert.match(JSON.stringify(research), /固态电池/);
  } finally {
    await client.close();
  }
});
