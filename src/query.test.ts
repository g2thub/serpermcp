import assert from "node:assert/strict";
import { test } from "node:test";
import { compileQuery, toSerperSearchBody } from "./query.js";
import type { SearchInput } from "./schema.js";

const base = (patch: Partial<SearchInput>): SearchInput => ({ q: "solid state battery", ...patch });

test("compiles operators into one query and quotes unsafe values", () => {
  const query = compileQuery(
    base({
      q: "  battery   anode  ",
      site: "example.com",
      filetype: "pdf",
      exact: "lithium metal",
      exclude: "spam, ads",
      or: "tutorial, guide",
      before: "2024-01-01",
      inurl: "lab notes",
    }),
  );
  assert.equal(
    query,
    'battery anode "lithium metal" site:example.com filetype:pdf inurl:"lab notes" before:2024-01-01 -spam -ads (tutorial OR guide)',
  );
});

test("search body keeps only Serper fields", () => {
  const body = toSerperSearchBody(
    base({
      gl: "us",
      hl: "en",
      num: 5,
      site: "arxiv.org",
      page: 2,
    }),
  );
  assert.deepEqual(Object.keys(body).sort(), ["gl", "hl", "num", "page", "q"]);
  assert.equal(body.q, "solid state battery site:arxiv.org");
  assert.equal("site" in body, false);
});
