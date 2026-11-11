import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { expireStaleHolds, formatDate, money, todayUK } from "@/lib/booking";
import { stripeConfigured, stripeTestMode } from "@/lib/stripe";
import { Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "awaiting", label: "To approve" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const d = (date: string) => formatDate(date, { weekday: "short", day: "numeric", month: "short" });

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "upcoming" } = await searchParams;
  await expireStaleHolds();
  const today = todayUK();

  const where =
    show === "awaiting" ? { status: "awaiting_approval" }
    : show === "past" ? { status: "confirmed", checkOut: { lte: today } }
    : show === "cancelled" ? { status: { in: ["cancelled", "declined"] } }
    : { status: "confirmed", checkOut: { gt: today } };

  const [bookings, arrivingToday, inHouse, next30Revenue, awaiting] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { room: true, unit: true },
      orderBy: { checkIn: show === "past" ? "desc" : "asc" },
      take: 200,
    }),
    prisma.booking.count({ where: { status: "confirmed", checkIn: today } }),
    prisma.booking.count({ where: { status: "confirmed", checkIn: { lte: today }, checkOut: { gt: today } } }),
    prisma.booking.aggregate({
      _sum: { total: true },
      where: { status: "confirmed", checkIn: { gte: today, lt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) } },
    }),
    prisma.booking.count({ where: { status: "awaiting_approval" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display text-3xl text-navy">Bookings</h1>
        <Link href="/admin/bookings/new" className="bg-navy text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-navy/90">
          + Phone booking
        </Link>
      </div>
      <p className="text-ink/60 mb-6">Rooms booked on the website, and any you add by hand.</p>

      {!stripeConfigured() && (
        <Card title="Turn on online payments">
          <p className="text-sm text-ink/70">
            The booking page already shows availability and prices, but guests cannot pay until Stripe is connected.
            In Plesk open the domain, then Node.js, then Custom environment variables, and add:
          </p>
          <ul className="text-sm text-ink/70 list-disc pl-5 space-y-1">
            <li>
              <code className="bg-cream px-1 rounded">STRIPE_SECRET_KEY</code> from Stripe, Developers, API keys.
              If the Stripe account is shared with the restaurant, create a restricted key
              (starts rk_live_) with Checkout Sessions, PaymentIntents and Refunds set to Write,
              so the restaurant&rsquo;s own key is left alone.
            </li>
            <li><code className="bg-cream px-1 rounded">STRIPE_WEBHOOK_SECRET</code> from Stripe, Developers, Webhooks (starts whsec_)</li>
          </ul>
          <p className="text-sm text-ink/70">Then restart the app.</p>
        </Card>
      )}
      {stripeTestMode() && (
        <p className="mb-5 rounded-md bg-amber-100 text-amber-900 text-sm px-4 py-2.5">
          Stripe is in test mode. Payments are not real. Switch to your sk_live_ key when you are ready.
        </p>
      )}

      {awaiting > 0 && (
        <Link href="/admin/bookings?show=awaiting"
          className="block mb-5 rounded-md bg-gold text-navy px-4 py-3 font-semibold hover:brightness-95">
          {awaiting} booking{awaiting === 1 ? "" : "s"} waiting for you to approve. Nothing has been
          charged to {awaiting === 1 ? "that guest" : "those guests"} yet.
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat n={String(arrivingToday)} label="arriving today" />
        <Stat n={String(inHouse)} label="staying tonight" />
        <Stat n={money(next30Revenue._sum.total || 0)} label="booked for the next 30 days" />
      </div>

      <div className="flex gap-1 mb-4 text-sm">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/bookings?show=${t.key}`}
            className={`px-3 py-1.5 rounded-md ${show === t.key ? "bg-navy text-white" : "text-ink/60 hover:text-navy"}`}>
            {t.label}{t.key === "awaiting" && awaiting > 0 ? ` (${awaiting})` : ""}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-ink/50 bg-white rounded-xl border border-black/10 p-6">Nothing here yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-black/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-left text-xs uppercase text-ink/60">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const isNew = Date.now() - b.createdAt.getTime() < 48 * 3600000;
                return (
                  <tr key={b.id} className="border-t border-black/5 hover:bg-cream/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="font-medium text-navy hover:underline">{b.guestName}</Link>
                      {isNew && show === "upcoming" && <span className="ml-2 text-[10px] font-bold uppercase bg-gold text-navy rounded px-1.5 py-0.5">New</span>}
                      <p className="text-xs text-ink/50">{b.reference}{b.source === "phone" ? " · phone" : ""}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d(b.checkIn)} to {d(b.checkOut)}
                      <p className="text-xs text-ink/50">{b.nights} night{b.nights === 1 ? "" : "s"} · {b.mealPlanName}</p>
                    </td>
                    <td className="px-4 py-3">
                      {b.room.name}
                      <p className="text-xs text-ink/50">{b.unit?.name || "No room assigned"}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {money(b.total)}
                      {b.refundedAmount > 0 && <p className="text-xs text-accent">refunded {money(b.refundedAmount)}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-black/10 p-5">
      <p className="text-3xl font-display text-navy">{n}</p>
      <p className="text-sm text-ink/60 mt-1">{label}</p>
    </div>
  );
}
