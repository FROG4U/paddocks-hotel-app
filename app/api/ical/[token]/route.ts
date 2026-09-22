import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportFeed } from "@/lib/ical";

export const dynamic = "force-dynamic";

// GET /api/ical/<secret token>.ics - one room's bookings, for other platforms.
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const unit = await prisma.roomUnit.findUnique({ where: { exportToken: token.replace(/\.ics$/i, "") } });
  if (!unit) return new Response("Not found", { status: 404 });

  // Event IDs must stay the same between fetches, so use the site's own
  // domain rather than whichever host the request arrived on.
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  let host = "paddockshotel.com";
  try { host = new URL(settings?.siteUrl || "").host || host; } catch { /* keep default */ }
  void req;
  const feed = await exportFeed(unit.id, host);
  if (!feed) return new Response("Not found", { status: 404 });

  return new Response(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${unit.name.replace(/[^a-z0-9]+/gi, "-")}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
