import { z } from "zod";

const requiredToken = (max: number, description: string) =>
  z.string().trim().min(1).max(max).describe(description);

const optionalToken = (max: number, description: string) =>
  requiredToken(max, description).optional();

export const searchShape = {
  q: requiredToken(500, "Search query. Put advanced operators in their own fields, not inside q."),
  gl: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .optional()
    .describe("Region code, such as us, gb, de. Omit to let Serper choose."),
  hl: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .optional()
    .describe("Language code, such as en, zh-cn, ja. Omit to let Serper choose."),
  location: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .optional()
    .describe("Location bias, for example 'SoHo, New York, United States'."),
  num: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("How many organic results to ask for. Serper defaults to 10."),
  page: z.number().int().min(1).max(20).optional().describe("Result page, starting at 1."),
  autocorrect: z.boolean().optional().describe("Let Serper autocorrect the query spelling."),
  tbs: z
    .enum(["qdr:h", "qdr:d", "qdr:w", "qdr:m", "qdr:y"])
    .optional()
    .describe("Time filter: past hour, day, week, month, or year."),
  site: optionalToken(200, "Limit results to this domain, for example github.com."),
  filetype: optionalToken(20, "Limit to a file type, for example pdf or doc."),
  inurl: optionalToken(200, "Page URL must contain this word."),
  intitle: optionalToken(200, "Page title must contain this word."),
  related: optionalToken(200, "Find sites similar to this domain."),
  cache: optionalToken(500, "Look up Google's cached copy of this URL."),
  before: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Only results before this date, YYYY-MM-DD."),
  after: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Only results after this date, YYYY-MM-DD."),
  exact: optionalToken(300, "Phrase that must appear exactly."),
  exclude: optionalToken(300, "Comma-separated terms to exclude."),
  or: optionalToken(300, "Comma-separated alternatives combined with OR."),
};

export const searchArgs = z.object(searchShape).strict();
export type SearchInput = z.infer<typeof searchArgs>;

export const scrapeShape = {
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .describe("Absolute http or https URL. Serper fetches it from their network."),
  includeMarkdown: z
    .boolean()
    .optional()
    .describe("Also ask Serper for a markdown rendering of the page."),
};

export const scrapeArgs = z.object(scrapeShape).strict();
export type ScrapeInput = z.infer<typeof scrapeArgs>;
