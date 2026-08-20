// (server-only import removed: this module is pure logic and safe to unit test)

/**
 * A free SEO writer. No API, no key, no cost - it builds titles,
 * descriptions and keywords from the page's own words plus the hotel's
 * location, using the patterns that actually rank for a local hotel:
 * the thing you offer, then the place people search for it in.
 */

type Hotel = {
  siteName: string;
  town: string;          // Ross-on-Wye
  locality: string;      // Symonds Yat West
  county: string;        // Herefordshire
  phone: string;
};

export type Suggestion = {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  notes: string;
};

/** Search terms that matter for each kind of page, most valuable first. */
const TOPICS: Record<string, {
  label: string; terms: string[]; blurb: string; titlePattern?: string;
}> = {
  home: {
    label: "Hotel",
    terms: ["hotel", "hotel and restaurant", "places to stay", "bed and breakfast", "accommodation"],
    blurb: "En-suite rooms, a restaurant and bar, and function rooms for weddings and parties.",
  },
  weddings: {
    label: "Wedding Venue",
    terms: ["wedding venue", "wedding packages", "licensed wedding venue", "country wedding venue", "wedding reception venue"],
    blurb: "A licensed venue with ceremonies indoors or in the gardens and a ballroom seating 200.",
  },
  celebrations: {
    label: "Function Rooms",
    terms: ["function room hire", "party venue", "private party venue", "birthday venue", "christening venue"],
    blurb: "Rooms for birthdays, anniversaries and private parties, with catering and free parking.",
  },
  dance: {
    label: "Dance Nights",
    terms: ["dance nights", "live music", "dance floor hire", "social dancing", "entertainment"],
    blurb: "A sprung dance floor, a stage and a bar for dance clubs and live music nights.",
  },
  "meeting-room": {
    label: "Meeting Rooms",
    terms: ["meeting rooms", "conference venue", "training venue", "business meeting room", "corporate events"],
    blurb: "Meeting and conference space with free parking and WiFi, 15 minutes from M50 Junction 4.",
  },
  bar: {
    label: "Restaurant & Bar",
    terms: ["Indian restaurant", "restaurant", "curry house", "places to eat", "bar"],
    blurb: "Freshly prepared Indian food, a well-stocked bar and a garden for warm evenings.",
  },
  contact: {
    label: "Contact & Directions",
    titlePattern: "{label} | {brand}, {locality}",
    terms: ["contact", "directions", "phone number", "how to find", "book a room"],
    blurb: "Address, phone number, email and a map, plus a form to send an enquiry.",
  },
  explore: {
    label: "Things to Do",
    terms: ["things to do", "attractions", "days out", "places to visit", "what to see"],
    blurb: "Symonds Yat Rock, canoeing on the River Wye, castles, caves and the Forest of Dean.",
  },
  room: {
    label: "Rooms",
    terms: ["hotel room", "en-suite room", "bed and breakfast", "accommodation", "places to stay"],
    blurb: "A comfortable en-suite room with free parking and breakfast downstairs.",
  },
};

/** Trim to a word boundary so a line never ends mid-word. */
function trimTo(text: string, max: number) {
  if (text.length <= max) return text.trim();
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf(" ");
  return cut.slice(0, stop > max * 0.6 ? stop : max).replace(/[,.\s]+$/, "");
}

/**
 * Whole sentences from the page, up to a limit. Returns "" rather than a
 * fragment, so the caller never has to glue half a sentence onto anything.
 */
function wholeSentences(body: string, max: number) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const out: string[] = [];
  let total = 0;
  for (const sentence of flat.split(/(?<=[.!?])\s+/)) {
    if (!/[.!?]$/.test(sentence)) continue;      // ignore trailing fragments
    if (total + sentence.length + 1 > max) break;
    out.push(sentence);
    total += sentence.length + 1;
  }
  return out.join(" ");
}

export function suggestSeoFree(input: {
  hotel: Hotel;
  kind: "page" | "room";
  slug: string;
  name: string;
  body: string;
}): Suggestion {
  const { hotel, kind, slug, name, body } = input;
  const topic = TOPICS[kind === "room" ? "room" : slug] ?? {
    label: name,
    terms: [name.toLowerCase()],
    blurb: "",
  };

  // ── Title: what you offer, where, then the hotel name, kept under 60 ──
  const brandShort = hotel.siteName.replace(/^The\s+/i, "");
  const fill = (pattern: string, brand: string) => pattern
    .replace("{label}", topic.label).replace("{brand}", brand)
    .replace("{town}", hotel.town).replace("{locality}", hotel.locality)
    .replace("{name}", name);

  const pattern = topic.titlePattern
    ?? (slug === "home" ? "{brand} | Hotel & Restaurant, {town}"
      : kind === "room" ? "{name}, {town} | {brand}"
      : "{label} in {town} | {brand}");

  let metaTitle = fill(pattern, hotel.siteName);
  if (metaTitle.length > 60) metaTitle = fill(pattern, brandShort);
  if (metaTitle.length > 60) metaTitle = trimTo(fill("{label}, {town} | {brand}", brandShort), 60);

  // ── Description: whole sentences only, then the place, then the phone ──
  const tail = `Call ${hotel.phone}.`;
  const place = `${hotel.locality}, ${hotel.town}`;
  const room = 158 - tail.length - 1;

  // Prefer the page's own words, but only complete sentences.
  let lead = wholeSentences(body, room - 24);
  if (lead.length < 40) lead = topic.blurb;            // fall back to the curated line
  if (!lead) lead = `${topic.label} at ${hotel.siteName}.`;

  const needsPlace = !new RegExp(hotel.town.replace(/[-]/g, "\\-"), "i").test(lead)
    && !new RegExp(hotel.locality, "i").test(lead);
  let middle = needsPlace ? `${lead} In ${place}.` : lead;

  // Still short? Add the curated line, but only as a whole sentence.
  if (middle.length + tail.length + 1 < 130 && topic.blurb && !middle.includes(topic.blurb)) {
    const withBlurb = `${middle} ${topic.blurb}`;
    if (withBlurb.length + tail.length + 1 <= 158) middle = withBlurb;
  }

  let metaDescription = `${middle} ${tail}`.replace(/\s+/g, " ").trim();
  if (metaDescription.length > 158) {
    // Drop whole sentences off the end until it fits, never mid-sentence.
    const sentences = middle.split(/(?<=[.!?])\s+/);
    while (sentences.length > 1 && sentences.join(" ").length + tail.length + 1 > 158) {
      sentences.pop();
    }
    metaDescription = `${sentences.join(" ")} ${tail}`.replace(/\s+/g, " ").trim();
    if (metaDescription.length > 158) metaDescription = trimTo(sentences.join(" "), 158 - tail.length - 2) + ". " + tail;
  }

  // ── Keywords: every term crossed with every way people name the place ──
  const places = [hotel.town, hotel.locality, "Wye Valley", hotel.county];
  const keywords: string[] = [];
  topic.terms.forEach((term, i) => {
    places.slice(0, i < 2 ? 4 : 2).forEach((p) => keywords.push(`${term} ${p}`));
  });
  if (kind === "room") keywords.unshift(`${name.toLowerCase()} ${hotel.town}`);
  keywords.push(`hotel near Forest of Dean`, `${topic.terms[0]} near me`);

  const unique = keywords
    .filter((k, i) => keywords.findIndex((o) => o.toLowerCase() === k.toLowerCase()) === i)
    .slice(0, 10);

  return {
    metaTitle,
    metaDescription,
    keywords: unique.join(", "),
    notes: `Built from this page's own wording plus "${topic.terms[0]}" and the places people search: ${hotel.town}, ${hotel.locality} and the Wye Valley.`,
  };
}
