import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, money } from "@/lib/booking";
import { cancelBookingAction } from "@/lib/booking-actions";
import { Card, ErrorBanner, SavedBanner } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-green-100 text-green-800" },
  pending: { label: "Waiting for payment", cls: "bg-amber-100 text-amber-900" },
  expired: { label: "Payment not completed", cls: "bg-black/5 text-ink/60" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-800" },
};

export default async function BookingDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; cancelled?: string; error?: string }>;
}) {
  const [{ id }, { saved, cancelled, error }] = await Promise.all([params, searchParams]);
  const b = await prisma.booking.findUnique({ where: { id }, include: { room: true, unit: true } });
  if (!b) notFound();

  const nights: { date: string; price: number; base: number; rule: string }[] =
    (() => { try { return JSON.parse(b.breakdownJson); } catch { return []; } })();
  const status = STATUS[b.status] ?? { label: b.status, cls: "bg-black/5" };
  const refundable = b.total - b.refundedAmount;

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-ink/50 hover:text-navy">&larr; All bookings</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-6">
        <h1 className="font-display text-3xl text-navy">{b.guestName}</h1>
        <span className={`text-xs font-semibold rounded px-2 py-1 ${status.cls}`}>{status.label}</span>
      </div>
      <SavedBanner show={saved === "1"} text="Booking saved." />
      <SavedBanner show={cancelled === "1"} text={b.refundedAmount ? `Cancelled and ${money(b.refundedAmount)} refunded.` : "Booking cancelled."} />
      <ErrorBanner message={error} />

      <Card title={`Booking ${b.reference}`}>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Item k="Room" v={`${b.room.name}${b.unit ? ` (${b.unit.name})` : ""}`} />
          <Item k="Booked" v={`${b.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}, ${b.source === "phone" ? "by phone" : "online"}`} />
          <Item k="Arrive" v={formatDate(b.checkIn)} />
          <Item k="Leave" v={formatDate(b.checkOut)} />
          <Item k="Guests" v={`${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`} />
          <Item k="Meals" v={b.mealPlanName} />
          <Item k="Email" v={b.guestEmail ? <a href={`mailto:${b.guestEmail}`} className="underline">{b.guestEmail}</a> : "-"} />
          <Item k="Phone" v={b.guestPhone ? <a href={`tel:${b.guestPhone.replace(/\s/g, "")}`} className="underline">{b.guestPhone}</a> : "-"} />
        </dl>
        {b.notes && (
          <div className="text-sm bg-cream/60 rounded-md p-3">
            <p className="text-xs uppercase text-ink/50 mb-1">Guest&rsquo;s note</p>
            <p className="whitespace-pre-line">{b.notes}</p>
          </div>
        )}
      </Card>

      <Card title="Price">
        <div className="text-sm space-y-1.5">
          {nights.map((n) => (
            <div key={n.date} className="flex justify-between">
              <span className="text-ink/70">{formatDate(n.date, { weekday: "short", day: "numeric", month: "short" })}{n.rule ? ` · ${n.rule}` : ""}</span>
              <span>{n.price < n.base && <s className="text-ink/40 mr-2">{money(n.base)}</s>}{money(n.price)}</span>
            </div>
          ))}
          {b.mealTotal > 0 && <div className="flex justify-between"><span className="text-ink/70">{b.mealPlanName}</span><span>{money(b.mealTotal)}</span></div>}
          {b.promoDiscount > 0 && <div className="flex justify-between text-green-700"><span>Code {b.promoCode}</span><span>-{money(b.promoDiscount)}</span></div>}
          <div className="flex justify-between border-t border-black/10 pt-2 font-semibold text-navy"><span>Total</span><span>{money(b.total)}</span></div>
          {b.refundedAmount > 0 && <div className="flex justify-between text-accent"><span>Refunded</span><span>-{money(b.refundedAmount)}</span></div>}
          {b.stripePaymentId && (
            <p className="text-xs text-ink/50 pt-2">
              Stripe payment <a href={`https://dashboard.stripe.com/payments/${b.stripePaymentId}`} target="_blank" className="underline">{b.stripePaymentId}</a>
            </p>
          )}
        </div>
      </Card>

      {b.status === "confirmed" && (
        <form action={cancelBookingAction}>
          <input type="hidden" name="id" value={b.id} />
          <Card title="Cancel this booking">
            <p className="text-sm text-ink/60 -mt-2">Cancelling frees the room on the website and on connected calendars.</p>
            {b.stripePaymentId && refundable > 0 ? (
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2 text-navy">
                  <input type="checkbox" name="refund" defaultChecked className="w-4 h-4 accent-[var(--navy)]" />
                  Refund the guest&rsquo;s card through Stripe
                </label>
                <label className="block max-w-xs">
                  <span className="block text-ink/60 mb-1">Amount to refund (£)</span>
                  <input name="refundAmount" inputMode="decimal" defaultValue={(refundable / 100).toString()}
                    className="border border-black/15 rounded-md px-3 py-2 w-full" />
                  <span className="block text-xs text-ink/50 mt-1">Lower this for a part refund.</span>
                </label>
              </div>
            ) : (
              <p className="text-sm text-ink/60">This booking was not paid online, so there is nothing to refund here.</p>
            )}
            <button className="bg-accent text-white font-semibold rounded-md px-5 py-2.5 hover:brightness-95">Cancel booking</button>
          </Card>
        </form>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-ink/50">{k}</dt>
      <dd className="text-navy">{v}</dd>
    </div>
  );
}
