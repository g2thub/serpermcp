import type { SearchInput } from "./schema.js";

const OFFICIAL_KEYS = ["q", "gl", "hl", "location", "num", "tbs", "page", "autocorrect"] as const;

const BARE_OPERATORS = ["site", "filetype", "inurl", "intitle", "related", "cache", "before", "after"] as const;

function quoteValue(value: string): string {
  if (/[\s"():]/.test(value)) {
    return `"${value.replace(/"/g, "")}"`;
  }
  return value;
}

/**
 * Fold operator fields into one Google query string.
 * The HTTP body later carries only Serper's own fields, so site/filetype
 * are not sent twice.
 */
export function compileQuery(input: SearchInput): string {
  const parts: string[] = [input.q.trim().replace(/\s+/g, " ")];

  if (input.exact) {
    parts.push(quoteValue(input.exact.trim()));
  }

  for (const key of BARE_OPERATORS) {
    const value = input[key]?.trim();
    if (value) {
      parts.push(`${key}:${quoteValue(value)}`);
    }
  }

  if (input.exclude) {
    for (const term of input.exclude.split(",")) {
      const cleaned = term.trim().replace(/^-/, "");
      if (cleaned) {
        parts.push(`-${quoteValue(cleaned)}`);
      }
    }
  }

  if (input.or) {
    const alternatives = input.or
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean)
      .map(quoteValue);
    if (alternatives.length > 0) {
      parts.push(`(${alternatives.join(" OR ")})`);
    }
  }

  return parts.join(" ").trim();
}

export function toSerperSearchBody(input: SearchInput): Record<string, unknown> {
  const body: Record<string, unknown> = { q: compileQuery(input) };
  for (const key of OFFICIAL_KEYS) {
    if (key === "q") continue;
    const value = input[key];
    if (value !== undefined) {
      body[key] = value;
    }
  }
  return body;
}
