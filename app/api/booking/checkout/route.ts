import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HOLD_MINUTES, formatDate, newReference, quote } from "@/lib/booking";
import { syncStale } from "@/lib/ical";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The address to send the guest back to after paying. */
function siteOrigin(req: NextRequest, siteUrl: string) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  try {
    const configured = new URL(siteUrl);
    if (host && host.replace(/^www\./, "") === configured.host.replace(/^www\./, "")) return configured.origin;
  } catch { /* fall through */ }
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host || req.nextUrl.host}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  // The hotel's own system holds the diary in any mode but "builtin", so
  // this website must not create a booking of its own.
  if (settings && settings.bookingMode !== "builtin") {
    return NextResponse.json({
      error: `Please book through our booking system, or call us on ${settings.phone}.`,
    }, { status: 409 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({
      error: `Online payment is not switched on yet. Please call us on ${settings?.phone || "the hotel"} to book.`,
    });
  }

  const guestName = String(body.guestName || "").trim().slice(0, 120);
  const guestEmail = String(body.guestEmail || "").trim().slice(0, 200);
  const guestPhone = String(body.guestPhone || "").trim().slice(0, 40);
  const notes = String(body.notes || "").trim().slice(0, 1500);
  if (!guestName) return NextResponse.json({ error: "Please enter your name." });
  if (!EMAIL_RE.test(guestEmail)) return NextResponse.json({ error: "Please enter a valid email address." });

  const room = await prisma.room.findUnique({ where: { slug: String(body.room || "") } });
  if (!room) return NextResponse.json({ error: "Please choose a room." });

  // Pull in the latest from other platforms before selling the room.
  await syncStale(2, room.id);

  const input = {
    roomId: room.id,
    checkIn: String(body.checkIn || ""),
    checkOut: String(body.checkOut || ""),
    adults: Number(body.adults) || 1,
    children: Number(body.children) || 0,
    mealPlanId: body.mealPlanId ? String(body.mealPlanId) : null,
    promoCode: body.promoCode ? String(body.promoCode) : null,
  };
  const q = await quote(input);
  if (!q.ok) return NextResponse.json({ error: q.error });

  // Reserve a specific room. Done in one transaction so two guests paying at
  // the same moment cannot both get the last room.
  const now = new Date();
  // If two payments collide the database refuses one of them outright;
  // treat that the same as the room having just gone.
  const booking = await prisma.$transaction(async (tx) => {
    const units = await tx.roomUnit.findMany({
      where: { roomId: room.id, active: true },
      orderBy: { order: "asc" },
      include: {
        bookings: {
          where: {
            OR: [{ status: "confirmed" }, { status: "pending", expiresAt: { gt: now } }],
            checkIn: { lt: input.checkOut }, checkOut: { gt: input.checkIn },
          },
          select: { id: true },
        },
        blocks: {
          where: { start: { lt: input.checkOut }, end: { gt: input.checkIn } },
          select: { id: true },
        },
      },
    });
    const unit = units.find((u) => u.bookings.length === 0 && u.blocks.length === 0);
    if (!unit) return null;

    return tx.booking.create({
      data: {
        reference: newReference(),
        roomId: room.id,
        unitId: unit.id,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights: q.nights,
        adults: Math.max(1, Math.floor(input.adults)),
        children: Math.max(0, Math.floor(input.children)),
        mealPlanId: input.mealPlanId,
        mealPlanName: q.mealPlanName,
        guestName, guestEmail, guestPhone, notes,
        roomTotal: q.roomTotal,
        mealTotal: q.mealTotal,
        promoCode: q.promoCode,
        promoDiscount: q.promoDiscount,
        total: q.total,
        breakdownJson: JSON.stringify(q.breakdown),
        status: "pending",
        source: "website",
        expiresAt: new Date(now.getTime() + HOLD_MINUTES * 60000),
      },
    });
  }).catch(() => null);
  if (!booking) {
    return NextResponse.json({ error: "Sorry, that room has just been booked. Please choose other dates." });
  }

  const origin = siteOrigin(req, settings?.siteUrl || "");

  // A 100% discount code: nothing to pay, confirm straight away.
  if (booking.total <= 0) {
    await prisma.$transaction([
      prisma.booking.update({ where: { id: booking.id }, data: { status: "confirmed", expiresAt: null } }),
      ...(booking.promoCode
        ? [prisma.promoCode.updateMany({ where: { code: booking.promoCode }, data: { uses: { increment: 1 } } })]
        : []),
    ]);
    return NextResponse.json({ url: `${origin}/book/confirmed?ref=${booking.reference}` });
  }

  try {
    const stay = `${formatDate(booking.checkIn, { day: "numeric", month: "short" })} to ${formatDate(booking.checkOut, { day: "numeric", month: "short", year: "numeric" })}`;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: guestEmail,
      client_reference_id: booking.reference,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: booking.total,
          product_data: {
            name: `${room.name}, ${booking.nights} night${booking.nights === 1 ? "" : "s"}`,
            description: `${stay}. ${booking.mealPlanName}. Booking ${booking.reference}.`,
          },
        },
      }],
      metadata: { bookingId: booking.id, reference: booking.reference },
      payment_intent_data: {
        description: `The Paddocks Hotel booking ${booking.reference}`,
        metadata: { bookingId: booking.id, reference: booking.reference },
      },
      // Stripe needs at least 30 minutes; the room is held a little longer.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${origin}/book/confirmed?ref=${booking.reference}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book?room=${room.slug}&cancelled=1`,
    });

    await prisma.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    // Release the room if we could not start the payment.
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "expired", expiresAt: null } });
    console.error("Stripe checkout failed", e);
    return NextResponse.json({
      error: `We could not start the payment. Please try again, or call us on ${settings?.phone || "the hotel"}.`,
    });
  }
}
