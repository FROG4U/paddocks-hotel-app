import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { confirmFromSession, getStripe, stripeConfigured } from "@/lib/stripe";
import { notifyHotel, sendBookingReceived } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Stripe tells us here when a payment completes, so a booking is confirmed
 * even if the guest closes the tab before reaching the confirmation page.
 * Set it up in Stripe: Developers, Webhooks, add endpoint
 *   https://paddockshotel.com/api/stripe/webhook
 * with the events checkout.session.completed and checkout.session.expired,
 * then put the signing secret in Plesk as STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text(); // the raw body is needed to check the signature
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const booking = await confirmFromSession(session.id);
    // Only on the first settle, so a repeated webhook does not email twice.
    if (booking && !booking.guestEmailsSent.includes("received")) {
      await sendBookingReceived(booking.id);
      await notifyHotel(booking.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await prisma.booking.updateMany({
        where: { id: bookingId, status: "pending" },
        data: { status: "expired", expiresAt: null },
      });
    }
  }

  return new Response("ok");
}
