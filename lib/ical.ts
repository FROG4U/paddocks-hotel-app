import "server-only";
import { prisma } from "./prisma";
import { addDays, todayUK } from "./booking";

/**
 * Calendar sync with other booking platforms, using iCal feeds.
 *
 * Almost every channel manager and booking site (Booking.com, Airbnb,
 * Expedia via a channel manager, Beds24, eviivo, Little Hotelier, FreeToBook
 * and more) can publish a calendar feed and read one. Each physical room gets:
 *
 *   - an EXPORT feed from this site, listing nights sold here, which the
 *     other system imports so it stops selling those nights; and
 *   - an IMPORT feed from the other system, listing nights sold there,
 *     which this site reads so it stops selling them.
 *
 * Feeds carry no guest names or details, only the dates.
 */

// ── Reading a feed ─────────────────────────────────────────────────────

type ParsedEvent = { uid: string; start: string; end: string; summary: string };

/** Turn an iCal date or date-time into a UK "YYYY-MM-DD". */
function toDate(value: string, params: string): string | null {
  const v = value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  if (!hh) return `${y}-${mo}-${d}`; // all-day date

  // A time in UTC: convert to the UK calendar date.
  if (z) {
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss));
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(utc);
  }
  // Floating or TZID time: the date part is the local date.
  void params;
  return `${y}-${mo}-${d}`;
}

export function parseIcal(text: string): ParsedEvent[] {
  // Undo line folding: a line starting with a space continues the previous one.
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur?.start) {
        let end = cur.end && cur.end > cur.start ? cur.end : addDays(cur.start, 1);
        if (end <= cur.start) end = addDays(cur.start, 1);
        events.push({
          uid: cur.uid || `${cur.start}-${end}`,
          start: cur.start, end,
          summary: (cur.summary || "").slice(0, 120),
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...params] = head.split(";");
    const key = name.toUpperCase();

    if (key === "DTSTART") cur.start = toDate(value, params.join(";")) ?? undefined;
    else if (key === "DTEND") cur.end = toDate(value, params.join(";")) ?? undefined;
    else if (key === "UID") cur.uid = value.slice(0, 200);
    else if (key === "SUMMARY") cur.summary = value.replace(/\\,/g, ",").replace(/\\n/g, " ");
  }
  return events;
}

/** Fetch a unit's import feed and replace its imported blocks. */
export async function syncUnit(unitId: string) {
  const unit = await prisma.roomUnit.findUnique({ where: { id: unitId } });
  if (!unit || !unit.icalImportUrl) return { ok: true, count: 0 };

  if (!/^https?:\/\//i.test(unit.icalImportUrl)) {
    await prisma.roomUnit.update({
      where: { id: unitId },
      data: { lastSyncAt: new Date(), lastSyncError: "The calendar address must start with https://" },
    });
    return { ok: false, count: 0 };
  }

  try {
    const res = await fetch(unit.icalImportUrl, {
      headers: { "User-Agent": "PaddocksHotelBooking/1.0" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`The other calendar replied with an error (${res.status}).`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That address did not return a calendar.");

    const today = todayUK();
    const events = parseIcal(text).filter((e) => e.end > today);

    await prisma.$transaction([
      prisma.calendarBlock.deleteMany({ where: { unitId, source: "ical" } }),
      ...(events.length
        ? [prisma.calendarBlock.createMany({
            data: events.map((e) => ({
              unitId, start: e.start, end: e.end, source: "ical", uid: e.uid, summary: e.summary,
            })),
          })]
        : []),
      prisma.roomUnit.update({ where: { id: unitId }, data: { lastSyncAt: new Date(), lastSyncError: "" } }),
    ]);
    return { ok: true, count: events.length };
  } catch (e) {
    // Keep the previous blocks: an outage elsewhere must not free up rooms here.
    await prisma.roomUnit.update({
      where: { id: unitId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: e instanceof Error ? e.message.slice(0, 200) : "Could not read the calendar.",
      },
    });
    return { ok: false, count: 0 };
  }
}

/**
 * Sync every unit (optionally just one room type) whose feed is older than
 * `maxAgeMinutes`. Called before taking a payment, so a room sold elsewhere
 * a few minutes ago is not sold again here.
 */
export async function syncStale(maxAgeMinutes: number, roomId?: string) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60000);
  const units = await prisma.roomUnit.findMany({
    where: {
      icalImportUrl: { not: "" },
      active: true,
      ...(roomId ? { roomId } : {}),
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }],
    },
    select: { id: true },
  });
  await Promise.all(units.map((u) => syncUnit(u.id)));
  return units.length;
}

// ── Writing a feed ─────────────────────────────────────────────────────

const ymd = (d: string) => d.replace(/-/g, "");

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** The feed another platform imports for one unit. */
export async function exportFeed(unitId: string, host: string) {
  const unit = await prisma.roomUnit.findUnique({
    where: { id: unitId },
    include: {
      room: true,
      bookings: {
        where: { status: { in: ["confirmed", "pending"] }, checkOut: { gt: todayUK() } },
      },
      // Manual blocks go out; imported ones do not, or two systems would
      // echo each other's bookings back and forth.
      blocks: { where: { source: "manual", end: { gt: todayUK() } } },
    },
  });
  if (!unit) return null;

  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Paddocks Hotel//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${unit.room.name} - ${unit.name}`,
  ];

  for (const b of unit.bookings) {
    // Unpaid bookings only count while they are still holding the room.
    if (b.status === "pending" && (!b.expiresAt || b.expiresAt < now)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${b.id}@${host}`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${ymd(b.checkIn)}`,
      `DTEND;VALUE=DATE:${ymd(b.checkOut)}`,
      "SUMMARY:Booked on paddockshotel.com",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  for (const k of unit.blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:block-${k.id}@${host}`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${ymd(k.start)}`,
      `DTEND;VALUE=DATE:${ymd(k.end)}`,
      "SUMMARY:Not available",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
