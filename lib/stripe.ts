import "server-only";
import Stripe from "stripe";
import { prisma } from "./prisma";

/**
 * Payments go through Stripe Checkout: the guest is sent to Stripe's own
 * secure page to pay, so card details never touch this website. Keys come
 * from environment variables set in Plesk, never the database.
 *
 *   STRIPE_SECRET_KEY      sk_live_... (or sk_test_... while testing)
 *   STRIPE_WEBHOOK_SECRET  whsec_...   (optional but recommended)
 */

let _stripe: Stripe | null = null;

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

/**
 * Settle a booking after the guest has paid on Stripe's page.
 *
 * When the hotel approves each booking by hand, the card is only
 * authorised at this point, not charged: the money is taken later, when
 * the booking is approved. Safe to call more than once, since it runs both
 * from Stripe's webhook and from the confirmation page.
 */
export async function confirmFromSession(sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return null;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  if (booking.status === "confirmed" || booking.status === "awaiting_approval") return booking;

  // With manual capture Stripe reports "unpaid" until the money is taken,
  // so an authorised card counts as a completed checkout too.
  const authorised = session.payment_status === "paid"
    || (session.payment_status === "unpaid" && session.status === "complete");
  if (!authorised) return booking;

  const paymentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? "";

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const needsApproval = settings?.requireApproval ?? true;

  // Only the first time through counts the discount code as used.
  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!fresh || fresh.status === "confirmed" || fresh.status === "awaiting_approval") return fresh;
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: needsApproval ? "awaiting_approval" : "confirmed",
        stripePaymentId: paymentId,
        expiresAt: null,
        ...(needsApproval ? {} : { approvedAt: new Date() }),
      },
    });
    if (b.promoCode) {
      await tx.promoCode.updateMany({ where: { code: b.promoCode }, data: { uses: { increment: 1 } } });
    }
    return b;
  });
  return updated;
}

/** Take the money that was authorised when the guest booked. */
export async function capturePayment(paymentIntentId: string) {
  return getStripe().paymentIntents.capture(paymentIntentId);
}

/** Release an authorisation without charging anything. */
export async function releasePayment(paymentIntentId: string) {
  return getStripe().paymentIntents.cancel(paymentIntentId);
}
