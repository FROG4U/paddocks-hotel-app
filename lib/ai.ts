import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";

/**
 * The AI SEO assistant. The API key comes from the ANTHROPIC_API_KEY
 * environment variable only - never the database, because the database file
 * is committed to a public repository.
 */
export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SeoSuggestion = z.object({
  metaTitle: z
    .string()
    .describe("Browser tab and Google result title. 50-60 characters including the hotel or town name."),
  metaDescription: z
    .string()
    .describe("The grey text under the Google result. 140-158 characters, written to earn the click."),
  keywords: z
    .string()
    .describe("6-10 search phrases people would actually type, comma separated, lower case, local where it makes sense."),
  bodyText: z
    .string()
    .describe("Rewritten page text, 2 short paragraphs separated by a single newline, naturally using the main search terms. British English."),
  notes: z
    .string()
    .describe("One or two sentences for the hotel owner explaining what you targeted and why."),
});

export type SeoSuggestion = z.infer<typeof SeoSuggestion>;

const SYSTEM = `You write search-optimised copy for a real, family-run hotel website. You are given the hotel's details and one page of the site, and you return improved SEO fields for that page.

Rules you must follow:
- British English. Write plainly, the way a good local hotel would speak. No marketing bluster, no "nestled", no "unparalleled", no exclamation marks.
- NEVER use long dashes. No em dash and no en dash anywhere in your output. Use a plain hyphen instead.
- metaTitle must be 50-60 characters. metaDescription must be 140-158 characters. Count them.
- Target what people actually type into Google, which for a hotel means the service plus the place: "hotel Ross-on-Wye", "wedding venue Wye Valley", "function room hire Herefordshire".
- Use the real town, county and landmarks you are given. Never invent facilities, prices, awards, star ratings or distances. If you do not know something, leave it out.
- bodyText must read naturally to a human first and only then to a search engine. Do not stuff keywords.`;

function client() {
  // Reads ANTHROPIC_API_KEY from the environment. The timeout is well under
  // the web server's own, so a slow call fails with a clear message rather
  // than leaving the admin staring at a spinning tab.
  return new Anthropic({ timeout: 3 * 60 * 1000, maxRetries: 1 });
}

/** Ask Claude for improved SEO fields for one page or room. */
export async function suggestSeo(input: {
  hotel: {
    name: string; addressLine1: string; addressLine2: string; town: string;
    postcode: string; phone: string; email: string; keywords: string;
  };
  pageKind: "page" | "room";
  pageName: string;
  url: string;
  currentTitle: string;
  currentDescription: string;
  currentKeywords: string;
  currentBody: string;
}): Promise<SeoSuggestion> {
  const { hotel, ...page } = input;

  const prompt = `THE HOTEL
Name: ${hotel.name}
Address: ${hotel.addressLine1}, ${hotel.addressLine2}, ${hotel.town} ${hotel.postcode}
County: Herefordshire. The hotel sits in the Wye Valley, a short walk from the River Wye, with the Forest of Dean across the water.
Nearby: Monmouth about 10 minutes, Ross-on-Wye about 15 minutes, M50 Junction 4 about 15 minutes, Gloucester about 40 minutes. Symonds Yat Rock, Goodrich Castle and canoe hire on the Wye are all close by.
Phone: ${hotel.phone}
Email: ${hotel.email}
Site-wide keywords already in use: ${hotel.keywords}

THE PAGE (${page.pageKind})
Name: ${page.pageName}
Address on the site: ${page.url}
Current browser tab title: ${page.currentTitle || "(empty)"}
Current search description: ${page.currentDescription || "(empty)"}
Current keywords: ${page.currentKeywords || "(empty)"}
Current page text:
${page.currentBody || "(empty)"}

Write improved SEO fields for this page. Keep any real facts from the current text. Do not repeat the site-wide keywords word for word, make this page's terms specific to what the page is about.`;

  const response = await client().messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
    // Medium effort keeps this to a few seconds. Writing one page of SEO copy
    // is a well-specified task and does not need deeper reasoning.
    output_config: { format: zodOutputFormat(SeoSuggestion), effort: "medium" },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("The AI did not return a usable suggestion. Please try again.");

  // Belt and braces: strip any long dashes that slipped through.
  const clean = (v: string) => v.replace(/[—–]/g, "-").trim();
  return {
    metaTitle: clean(parsed.metaTitle),
    metaDescription: clean(parsed.metaDescription),
    keywords: clean(parsed.keywords),
    bodyText: clean(parsed.bodyText),
    notes: clean(parsed.notes),
  };
}
