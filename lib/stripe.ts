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
 * Mark a booking paid. Safe to call more than once: from Stripe's webhook,
 * and again from the confirmation page in case the webhook is not set up.
 */
export async function confirmFromSession(sessionId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return null;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  if (booking.status === "confirmed") return booking;
  if (session.payment_status !== "paid") return booking;

  const paymentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? "";

  // Only the first confirmation counts the discount code as used.
  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!fresh || fresh.status === "confirmed") return fresh;
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", stripePaymentId: paymentId, expiresAt: null },
    });
    if (b.promoCode) {
      await tx.promoCode.updateMany({ where: { code: b.promoCode }, data: { uses: { increment: 1 } } });
    }
    return b;
  });
  return updated;
}
