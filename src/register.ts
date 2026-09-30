import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PROMPTS } from "./prompts.js";
import { scrapeArgs, scrapeShape, searchArgs, searchShape } from "./schema.js";
import { scrapePage, searchWeb } from "./serper.js";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function toolError(error: unknown): { isError: true; content: [{ type: "text"; text: string }] } {
  const text = error instanceof Error ? error.message : String(error);
  console.error(text);
  return { isError: true, content: [{ type: "text", text }] };
}

function ok(value: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function registerSerper(
  server: McpServer,
  options: { apiKey: string; fetchImpl?: typeof fetch },
): void {
  server.registerTool(
    "google_search",
    {
      title: "Serper Google search",
      description: [
        "Search Google through Serper and return the JSON payload: organic results, knowledge graph, people also ask, and related searches.",
        "Put operators in fields (site, filetype, inurl, intitle, related, cache, before, after, exact, exclude, or). They are compiled into one q.",
        "gl and hl are optional. Each call spends Serper credits.",
      ].join(" "),
      inputSchema: searchShape,
      annotations: readOnly,
    },
    async (args) => {
      try {
        const input = searchArgs.parse(args);
        return ok(await searchWeb(input, options.apiKey, options.fetchImpl));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "scrape",
    {
      title: "Serper page scrape",
      description: [
        "Fetch one http(s) page through Serper. Returns text, optional markdown, head metadata, and JSON-LD.",
        "Serper downloads the page on their servers. This process only talks to scrape.serper.dev.",
        "Each call spends Serper credits.",
      ].join(" "),
      inputSchema: scrapeShape,
      annotations: readOnly,
    },
    async (args) => {
      try {
        const input = scrapeArgs.parse(args);
        return ok(await scrapePage(input, options.apiKey, options.fetchImpl));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  for (const prompt of PROMPTS) {
    const argsSchema: Record<string, z.ZodTypeAny> = {};
    for (const arg of prompt.args) {
      const field = z.string().describe(arg.description);
      argsSchema[arg.name] = arg.required ? field.min(1) : field.optional();
    }
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema,
      },
      (args) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: prompt.render(args as Record<string, string | undefined>),
            },
          },
        ],
      }),
    );
  }
}
