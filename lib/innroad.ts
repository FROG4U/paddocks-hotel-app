import "server-only";

/**
 * Handing booking over to innRoad.
 *
 * innRoad is the hotel's property management system: it holds the rooms,
 * rates and availability, and its channel manager keeps Booking.com and the
 * other travel sites in step. So the website must not sell rooms itself.
 * Instead the Book buttons lead to innRoad's own booking engine, which
 * makes a double booking impossible: there is only one diary.
 *
 * The booking engine can be shown inside a page on this site, but only if
 * innRoad allows it. Browsers refuse to display another site in a frame
 * when it sends an X-Frame-Options header, or a Content-Security-Policy
 * that names who may frame it. We check for those rather than guess, and
 * fall back to a button that opens innRoad in a new tab.
 */

export type EmbedCheck = {
  ok: boolean;              // the address responded
  canEmbed: boolean;        // and it allows being shown inside our pages
  status: number;
  reason: string;           // plain English, for the admin screen
};

export function looksLikeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Does this policy let paddockshotel.com frame the page? */
function framingAllowed(csp: string, site: string) {
  const rule = csp
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.toLowerCase().startsWith("frame-ancestors"));
  if (!rule) return null; // policy says nothing about framing

  const values = rule.split(/\s+/).slice(1).map((v) => v.toLowerCase().replace(/['"]/g, ""));
  if (values.includes("none")) return false;
  if (values.includes("*")) return true;

  let host = "";
  try { host = new URL(site).host.toLowerCase(); } catch { /* no site configured */ }
  return values.some((v) => {
    const bare = v.replace(/^https?:\/\//, "");
    if (!host) return false;
    if (bare === host) return true;
    if (bare.startsWith("*.")) return host.endsWith(bare.slice(1));
    return false;
  });
}

/** Ask innRoad's booking engine whether it can be shown inside our site. */
export async function checkEmbeddable(url: string, siteUrl: string): Promise<EmbedCheck> {
  if (!looksLikeUrl(url)) {
    return { ok: false, canEmbed: false, status: 0, reason: "That does not look like a web address. It should start with https://" };
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PaddocksHotelSite/1.0)" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false, canEmbed: false, status: res.status,
        reason: `The booking engine replied with an error (${res.status}). Check the address is right and the page opens in your browser.`,
      };
    }

    const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
    const csp = res.headers.get("content-security-policy") || "";

    if (xfo.includes("deny")) {
      return { ok: true, canEmbed: false, status: res.status, reason: "innRoad does not allow its booking engine to be shown inside another site, so guests will open it in a new tab instead." };
    }
    if (xfo.includes("sameorigin")) {
      return { ok: true, canEmbed: false, status: res.status, reason: "innRoad only allows its booking engine on its own pages, so guests will open it in a new tab instead." };
    }

    const allowed = framingAllowed(csp, siteUrl);
    if (allowed === false) {
      return { ok: true, canEmbed: false, status: res.status, reason: "innRoad's security policy does not list paddockshotel.com as allowed to display it, so guests will open it in a new tab instead. innRoad support can usually add your domain to that list." };
    }

    return {
      ok: true, canEmbed: true, status: res.status,
      reason: allowed === true
        ? "innRoad allows this site to display the booking engine, so it will appear inside your page."
        : "innRoad does not block being displayed inside another site, so it will appear inside your page.",
    };
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError"
      ? "The booking engine did not respond in time. Try again, or check the address."
      : "Could not reach that address. Check it is correct and opens in your browser.";
    return { ok: false, canEmbed: false, status: 0, reason: msg };
  }
}

/**
 * Pass the guest's dates through to innRoad when we have them. innRoad's
 * booking engine, like most, reads them from the address. Any extra values
 * the hotel already has in their link are kept.
 */
export function innRoadLink(base: string, params?: { checkIn?: string; checkOut?: string; adults?: number }) {
  if (!looksLikeUrl(base)) return base;
  try {
    const u = new URL(base);
    if (params?.checkIn) u.searchParams.set("checkin", params.checkIn);
    if (params?.checkOut) u.searchParams.set("checkout", params.checkOut);
    if (params?.adults) u.searchParams.set("adults", String(params.adults));
    return u.toString();
  } catch {
    return base;
  }
}
