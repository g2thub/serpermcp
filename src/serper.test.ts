import assert from "node:assert/strict";
import { test } from "node:test";
import { assertHttpUrl, presentScrape, scrapePage, searchWeb, SEARCH_URL, SCRAPE_URL, SerperError } from "./serper.js";
import type { ScrapeInput, SearchInput } from "./schema.js";

function mockFetch(status: number, body: unknown, capture: { url?: string; init?: RequestInit }): typeof fetch {
  return (async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    capture.url = String(url);
    capture.init = init;
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

test("search posts the compiled query and the api key only to Serper", async () => {
  const capture: { url?: string; init?: RequestInit } = {};
  const input: SearchInput = { q: "mcp", site: "github.com", gl: "us" };
  const result = await searchWeb(input, "secret-key", mockFetch(200, { organic: [] }, capture));
  assert.deepEqual(result, { organic: [] });
  assert.equal(capture.url, SEARCH_URL);
  const headers = capture.init?.headers as Record<string, string>;
  assert.equal(headers["X-API-KEY"], "secret-key");
  assert.deepEqual(JSON.parse(String(capture.init?.body)), {
    q: "mcp site:github.com",
    gl: "us",
  });
});

test("auth failure names the key setting and hides the key", async () => {
  const capture: { url?: string; init?: RequestInit } = {};
  await assert.rejects(
    () => searchWeb({ q: "mcp" }, "secret-key", mockFetch(401, { message: "invalid" }, capture)),
    (error: unknown) => {
      assert.ok(error instanceof SerperError);
      assert.match(error.message, /SERPER_API_KEY/);
      assert.equal(error.message.includes("secret-key"), false);
      return true;
    },
  );
});

test("timeout becomes a SerperError", async () => {
  const failing = (async () => {
    const error = new Error("timed out");
    error.name = "TimeoutError";
    throw error;
  }) as typeof fetch;
  await assert.rejects(() => searchWeb({ q: "mcp" }, "k", failing), /timed out/);
});

test("scrape rejects non-http urls before any request", async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const input = { url: "file:///etc/passwd", includeMarkdown: false } as ScrapeInput;
  await assert.rejects(() => scrapePage(input, "k", fetchImpl), /http or https/);
  assert.equal(called, false);
  assert.throws(() => assertHttpUrl("javascript:alert(1)"), /http or https/);
});

test("scrape posts to scrape.serper.dev and caps long text", async () => {
  const capture: { url?: string; init?: RequestInit } = {};
  const long = "a".repeat(20_050);
  const presented = await scrapePage(
    { url: "https://example.com/docs", includeMarkdown: true },
    "k",
    mockFetch(200, { text: long, markdown: "ok", metadata: { title: "Docs" }, credits: 1 }, capture),
  );
  assert.equal(capture.url, SCRAPE_URL);
  assert.deepEqual(JSON.parse(String(capture.init?.body)), {
    url: "https://example.com/docs",
    includeMarkdown: true,
  });
  assert.equal(presented.truncated, true);
  assert.equal((presented.text as string).length, 20_000);
  assert.equal(presented.markdown, "ok");
  assert.deepEqual(presentScrape({ text: "short" }, "https://example.com/docs").truncated, undefined);
});
