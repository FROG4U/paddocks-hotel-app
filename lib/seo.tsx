import type { Metadata } from "next";
import { getSettings, parseHours } from "./data";

type Settings = Awaited<ReturnType<typeof getSettings>>;

export function siteUrl(s: Settings) {
  return (s.siteUrl || "https://paddockshotel.com").replace(/\/$/, "");
}

export function absolute(s: Settings, pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl(s)}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Split a comma separated keyword string into the array Next expects. */
export function keywordList(...sources: (string | undefined | null)[]) {
  const out: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    for (const k of src.split(",")) {
      const t = k.trim();
      if (t && !out.some((e) => e.toLowerCase() === t.toLowerCase())) out.push(t);
    }
  }
  return out;
}

/**
 * Build a full Metadata object for a public page: title, description,
 * keywords, canonical URL and Open Graph / Twitter cards.
 */
export function pageMetadata(opts: {
  settings: Settings;
  title: string;
  description: string;
  path: string;          // e.g. "/weddings" ("/" for home)
  keywords?: string;
  image?: string;
}): Metadata {
  const { settings: s, title, description, path } = opts;
  const url = absolute(s, path === "/" ? "" : path);
  const image = absolute(s, opts.image || s.ogImage || "/uploads/home.jpg");

  return {
    metadataBase: new URL(siteUrl(s)),
    // absolute stops the layout's "%s | The Paddocks Hotel" template from
    // appending the hotel name a second time.
    title: { absolute: title },
    description,
    keywords: keywordList(opts.keywords, s.metaKeywords),
    alternates: { canonical: url || siteUrl(s) },
    openGraph: {
      type: "website",
      siteName: s.siteName,
      title,
      description,
      url: url || siteUrl(s),
      locale: "en_GB",
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

/** Opening hours in the schema.org format, e.g. "Mo-Fr 17:00-22:30". */
function openingHours(s: Settings) {
  const DAYS: Record<string, string> = {
    mon: "Mo", tue: "Tu", wed: "We", thu: "Th",
    fri: "Fr", sat: "Sa", sun: "Su",
  };
  const to24 = (t: string) => {
    const m = t.trim().toLowerCase().match(/^(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] || "00";
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  };

  const out: string[] = [];
  for (const row of parseHours(s.hoursJson)) {
    const days = row.label
      .split(/[-\u2013]/)
      .map((d) => DAYS[d.trim().slice(0, 3).toLowerCase()])
      .filter(Boolean);
    const times = row.value.split("-").map((t) => to24(t));
    if (!days.length || times.length !== 2 || times.some((t) => !t)) continue;
    out.push(`${days.join("-")} ${times[0]}-${times[1]}`);
  }
  return out;
}

/**
 * schema.org Hotel markup. This is what puts the address, phone, hours and
 * star-style details into Google's local results and knowledge panel.
 */
export function hotelJsonLd(s: Settings) {
  const url = siteUrl(s);
  const sameAs = [s.facebookUrl, s.instagramUrl, s.googleUrl, s.tiktokUrl].filter(
    (u) => u && !/^https?:\/\/(www\.)?(facebook|instagram)\.com\/?$/i.test(u)
  );

  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${url}/#hotel`,
    name: s.siteName,
    description: s.metaDescription,
    url,
    telephone: s.phone,
    email: s.email,
    image: absolute(s, s.ogImage || "/uploads/home.jpg"),
    logo: absolute(s, s.logoUrl),
    priceRange: "££",
    currenciesAccepted: "GBP",
    address: {
      "@type": "PostalAddress",
      streetAddress: s.addressLine1,
      addressLocality: s.addressLine2 || s.town,
      addressRegion: "Herefordshire",
      postalCode: s.postcode,
      addressCountry: "GB",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: s.geoLat,
      longitude: s.geoLng,
    },
    ...(openingHours(s).length ? { openingHours: openingHours(s) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    amenityFeature: [
      "Free parking",
      "Free WiFi",
      "On-site restaurant",
      "Bar",
      "Wedding and function rooms",
      "Garden",
    ].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  };
}

/** Breadcrumbs help Google show the site structure under the result. */
export function breadcrumbJsonLd(s: Settings, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolute(s, item.path === "/" ? "" : item.path) || siteUrl(s),
    })),
  };
}

/** A single room, marked up so Google understands it is bookable lodging. */
export function roomJsonLd(s: Settings, room: {
  name: string; slug: string; description: string; heroImage: string; price: string; showPrice: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: room.name,
    description: room.description,
    url: absolute(s, `/rooms/${room.slug}`),
    ...(room.heroImage ? { image: absolute(s, room.heroImage) } : {}),
    containedInPlace: { "@type": "Hotel", name: s.siteName, "@id": `${siteUrl(s)}/#hotel` },
    ...(room.showPrice && room.price
      ? { offers: { "@type": "Offer", price: room.price.replace(/[^0-9.]/g, "") || undefined, priceCurrency: "GBP", availability: "https://schema.org/InStock" } }
      : {}),
  };
}

/** Renders a JSON-LD block. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
