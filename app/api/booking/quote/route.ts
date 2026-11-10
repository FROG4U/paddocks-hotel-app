import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quote } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (settings && settings.bookingMode !== "builtin") {
    return NextResponse.json({ ok: false, error: "Online booking is handled by our booking system." }, { status: 409 });
  }

  const room = await prisma.room.findUnique({ where: { slug: String(body.room || "") } });
  if (!room) return NextResponse.json({ ok: false, error: "Please choose a room." });

  const q = await quote({
    roomId: room.id,
    checkIn: String(body.checkIn || ""),
    checkOut: String(body.checkOut || ""),
    adults: Number(body.adults) || 1,
    children: Number(body.children) || 0,
    mealPlanId: body.mealPlanId ? String(body.mealPlanId) : null,
    promoCode: body.promoCode ? String(body.promoCode) : null,
  });
  return NextResponse.json(q, { headers: { "Cache-Control": "no-store" } });
}
