#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSerper } from "./register.js";

const apiKey = process.env.SERPER_API_KEY?.trim();
if (!apiKey) {
  console.error("SERPER_API_KEY is required. Put it in the MCP client env, not in source.");
  process.exit(1);
}

const server = new McpServer({
  name: "serpermcp",
  version: "1.0.0",
});

registerSerper(server, { apiKey });

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("serpermcp listening on stdio");
