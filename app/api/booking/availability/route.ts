import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, calendarFor, daysBetween, isDate, todayUK } from "@/lib/booking";
import { syncStale } from "@/lib/ical";

export const dynamic = "force-dynamic";

// GET /api/booking/availability?room=king-room&from=2026-10-01&to=2026-12-01
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const room = await prisma.room.findUnique({ where: { slug: q.get("room") || "" } });
  if (!room || !room.bookable) return NextResponse.json({ error: "Unknown room" }, { status: 404 });

  const today = todayUK();
  let from = q.get("from") || today;
  let to = q.get("to") || addDays(from, 62);
  if (!isDate(from) || !isDate(to)) return NextResponse.json({ error: "Bad dates" }, { status: 400 });
  if (daysBetween(from, to) > 100) to = addDays(from, 100);
  if (from < today) from = today;

  // Refresh other platforms' calendars in the background if they are old.
  // Not awaited: the calendar shows straight away, checkout re-checks.
  syncStale(15, room.id).catch(() => {});

  const days = await calendarFor(room.id, from, to);
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
