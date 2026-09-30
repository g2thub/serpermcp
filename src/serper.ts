import { toSerperSearchBody } from "./query.js";
import type { ScrapeInput, SearchInput } from "./schema.js";

export const SEARCH_URL = "https://google.serper.dev/search";
export const SCRAPE_URL = "https://scrape.serper.dev";
const TEXT_LIMIT = 20_000;

export class SerperError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SerperError";
    this.status = status;
  }
}

function explainStatus(status: number, body: string): string {
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 300);
  const suffix = detail ? ` Serper said: ${detail}` : "";
  switch (status) {
    case 400:
      return `Serper rejected the request (400). Check the query or URL.${suffix}`;
    case 401:
    case 403:
      return `Serper refused the API key (${status}). Check SERPER_API_KEY.${suffix}`;
    case 429:
      return `Serper rate or credit limit (429). Wait, or check the account balance.${suffix}`;
    default:
      return `Serper request failed (${status}).${suffix}`;
  }
}

export async function postJson(
  url: string,
  body: unknown,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new SerperError("Serper request timed out. Retry once, or narrow the query.");
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new SerperError(`Could not reach Serper: ${message}`);
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new SerperError(explainStatus(response.status, raw), response.status);
  }
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new SerperError("Serper returned a body that is not JSON.");
  }
}

export function assertHttpUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SerperError("url must be an absolute http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SerperError("url must use http or https. Serper fetches the page on its side.");
  }
  return url.toString();
}

export function presentScrape(payload: unknown, requestedUrl: string): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { url: requestedUrl, raw: payload };
  }
  const source = payload as Record<string, unknown>;
  let truncated = false;
  const cut = (value: unknown): unknown => {
    if (typeof value !== "string" || value.length <= TEXT_LIMIT) {
      return value;
    }
    truncated = true;
    return value.slice(0, TEXT_LIMIT);
  };
  const presented: Record<string, unknown> = {
    url: requestedUrl,
    text: cut(source.text),
  };
  if (source.markdown !== undefined) presented.markdown = cut(source.markdown);
  if (source.metadata !== undefined) presented.metadata = source.metadata;
  if (source.jsonld !== undefined) presented.jsonld = source.jsonld;
  if (source.credits !== undefined) presented.credits = source.credits;
  if (truncated) {
    presented.truncated = true;
    presented.truncation_note = `text and markdown were capped at ${TEXT_LIMIT} characters`;
  }
  return presented;
}

export async function searchWeb(
  input: SearchInput,
  apiKey: string,
  fetchImpl?: typeof fetch,
): Promise<unknown> {
  return postJson(SEARCH_URL, toSerperSearchBody(input), apiKey, fetchImpl);
}

export async function scrapePage(
  input: ScrapeInput,
  apiKey: string,
  fetchImpl?: typeof fetch,
): Promise<Record<string, unknown>> {
  const url = assertHttpUrl(input.url);
  const body: Record<string, unknown> = { url };
  if (input.includeMarkdown) {
    body.includeMarkdown = true;
  }
  const payload = await postJson(SCRAPE_URL, body, apiKey, fetchImpl);
  return presentScrape(payload, url);
}
