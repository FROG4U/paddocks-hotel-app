import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { formatDate, money } from "@/lib/booking";
import { confirmFromSession, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function Confirmed({ searchParams }:
  { searchParams: Promise<{ ref?: string; session_id?: string }> }) {
  const { ref, session_id } = await searchParams;
  const s = await getSettings();

  // Confirm here as well as in the webhook, so it works even if the webhook
  // is not set up yet.
  if (session_id && stripeConfigured()) {
    try { await confirmFromSession(session_id); } catch (e) { console.error("confirm failed", e); }
  }

  const booking = ref
    ? await prisma.booking.findUnique({ where: { reference: ref }, include: { room: true } })
    : null;
  // Only show details to the person who has just paid for them.
  const allowed = booking && (booking.total <= 0 || (session_id && booking.stripeSessionId === session_id));

  if (!booking || !allowed) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="section-title mb-6">Booking</h1>
        <p className="text-ink/70">We could not find that booking. If you have paid, please call us on {s.phone} and we will check it for you.</p>
      </section>
    );
  }

  const confirmed = booking.status === "confirmed";

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="eyebrow text-navy">{confirmed ? "Thank you" : "Nearly there"}</p>
        <h1 className="section-title mt-2 mb-6">{confirmed ? "Your stay is booked" : "Payment processing"}</h1>
        <p className="text-ink/70 mb-10">
          {confirmed
            ? `Your booking reference is ${booking.reference}. Stripe will email your receipt to ${booking.guestEmail}.`
            : "Your payment is still being confirmed. Please refresh in a minute. You have not been charged twice."}
        </p>

        <div className="bg-white rounded-lg shadow text-left p-6 sm:p-8 space-y-3 text-sm">
          <Row k="Reference" v={booking.reference} />
          <Row k="Room" v={booking.room.name} />
          <Row k="Arrive" v={formatDate(booking.checkIn)} />
          <Row k="Leave" v={formatDate(booking.checkOut)} />
          <Row k="Nights" v={String(booking.nights)} />
          <Row k="Guests" v={`${booking.adults} adult${booking.adults === 1 ? "" : "s"}${booking.children ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}` : ""}`} />
          <Row k="Meals" v={booking.mealPlanName} />
          {booking.promoDiscount > 0 && <Row k={`Code ${booking.promoCode}`} v={`-${money(booking.promoDiscount)}`} />}
          <div className="border-t border-black/10 pt-3">
            <Row k={confirmed ? "Paid" : "Total"} v={money(booking.total)} bold />
          </div>
        </div>

        <p className="text-sm text-ink/60 mt-8">
          Questions about your stay? Call {s.phone} or email {s.email}.
        </p>
        <Link href="/" className="btn-brand mt-8">Back to the hotel</Link>
      </div>
    </section>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink/60">{k}</span>
      <span className={bold ? "font-display text-xl text-navy" : "text-navy font-medium text-right"}>{v}</span>
    </div>
  );
}
