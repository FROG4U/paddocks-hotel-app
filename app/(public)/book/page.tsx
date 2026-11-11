import type { Metadata } from "next";
import BookingWidget from "@/components/BookingWidget";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { stripeConfigured } from "@/lib/stripe";
import { todayUK } from "@/lib/booking";
import { innRoadLink, looksLikeUrl } from "@/lib/innroad";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return pageMetadata({
    settings: s,
    title: `Book a Room Online | ${s.siteName}, Ross-on-Wye`,
    description: "Check availability and book a room at The Paddocks Hotel in Symonds Yat West near Ross-on-Wye. Best price when you book direct, with meal packages available.",
    keywords: "book hotel Ross-on-Wye, hotel availability Symonds Yat, book direct Wye Valley hotel",
    path: "/book",
  });
}

export default async function BookPage({ searchParams }:
  { searchParams: Promise<{ room?: string; cancelled?: string; checkIn?: string; checkOut?: string }> }) {
  const { room, cancelled, checkIn, checkOut } = await searchParams;
  const s = await getSettings();

  const header = (
    <section className="bg-navy text-white text-center pt-16 pb-14 px-6">
      <p className="eyebrow">Book direct for the best price</p>
      <h1 className="hero-title mt-3">Book a Room</h1>
    </section>
  );

  // ── Bookings are handled by the hotel's innRoad system ──
  if (s.bookingMode === "innroad") {
    const url = innRoadLink(s.innRoadUrl, { checkIn, checkOut });
    const ready = looksLikeUrl(s.innRoadUrl);

    if (!ready) {
      return (
        <>
          {header}
          <section className="bg-white">
            <div className="mx-auto max-w-2xl px-6 py-20 text-center">
              <p className="text-lg text-ink/80">
                To book a room please call us on{" "}
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline text-navy">{s.phone}</a>{" "}
                or email{" "}
                <a href={`mailto:${s.email}`} className="underline text-navy">{s.email}</a>.
                We will be delighted to help.
              </p>
            </div>
          </section>
        </>
      );
    }

    return (
      <>
        {header}
        <section className="bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-10 lg:py-14">
            {s.innRoadEmbed ? (
              <>
                {/* innRoad's booking engine, shown inside the page. */}
                <iframe
                  src={url}
                  title="Check availability and book a room"
                  className="w-full rounded-lg border border-black/10 bg-cream/30"
                  style={{ height: "min(1400px, 150vh)", minHeight: "820px" }}
                  loading="lazy"
                  allow="payment"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                {/* Always offered, so a guest is never stuck if the frame
                    does not load on their device or browser. */}
                <p className="text-center text-sm text-ink/60 mt-5">
                  Trouble with the booking form?{" "}
                  <a href={url} target="_blank" rel="noopener" className="underline text-navy">
                    Open it in a new tab
                  </a>{" "}
                  or call us on{" "}
                  <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline text-navy">{s.phone}</a>.
                </p>
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-lg text-ink/80 mb-8 max-w-xl mx-auto">
                  Check availability and book your room with us. You will be taken to our secure
                  booking system, where your reservation is confirmed straight away.
                </p>
                <a href={url} target="_blank" rel="noopener" className="btn-brand">
                  Check availability
                </a>
                <p className="text-sm text-ink/60 mt-8">
                  Prefer to talk to someone? Call{" "}
                  <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline text-navy">{s.phone}</a>.
                </p>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  // ── No online booking ──
  if (s.bookingMode === "phone") {
    return (
      <>
        {header}
        <section className="bg-white">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center">
            <p className="text-lg text-ink/80">
              To book a room please call us on{" "}
              <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline text-navy">{s.phone}</a>{" "}
              or email{" "}
              <a href={`mailto:${s.email}`} className="underline text-navy">{s.email}</a>.
            </p>
          </div>
        </section>
      </>
    );
  }

  // ── The website's own booking engine ──

  // Booking switched off by the hotel.
  if (!s.bookingOpen) {
    return (
      <>
        {header}
        <section className="bg-white">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center">
            <p className="text-lg text-ink/80">{s.bookingClosedNote}</p>
            <p className="mt-6 text-ink/70">
              <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="underline text-navy">{s.phone}</a>
              {" · "}
              <a href={`mailto:${s.email}`} className="underline text-navy">{s.email}</a>
            </p>
          </div>
        </section>
      </>
    );
  }

  const today = todayUK();
  const [rooms, mealPlans, offers] = await Promise.all([
    prisma.room.findMany({
      where: { bookable: true, basePrice: { gt: 0 }, units: { some: { active: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.mealPlan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.priceRule.findMany({
      where: { active: true, showOnSite: true, end: { gte: today } },
      orderBy: { start: "asc" },
    }),
  ]);
  const roomById = new Map(rooms.map((r) => [r.id, r.slug]));

  return (
    <>
      {header}
      <section className="bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-12 lg:py-16">
          <BookingWidget
            rooms={rooms.map((r) => ({
              slug: r.slug, name: r.name, image: r.heroImage, maxGuests: r.maxGuests,
              basePrice: r.basePrice, shortDesc: r.shortDesc, bedType: r.bedType,
            }))}
            mealPlans={mealPlans.map((m) => ({
              id: m.id, name: m.name, description: m.description,
              breakfast: m.breakfast, lunch: m.lunch, dinner: m.dinner,
              pricePerPerson: m.pricePerPerson, childPrice: m.childPrice,
            }))}
            offers={offers.map((o) => ({
              id: o.id, name: o.name, badge: o.badge, description: o.description, image: o.image,
              roomSlug: o.roomId ? roomById.get(o.roomId) ?? null : null,
            }))}
            initialRoom={room && rooms.some((r) => r.slug === room) ? room : ""}
            phone={s.phone}
            paymentsOn={stripeConfigured()}
            cancelled={cancelled === "1"}
            checkInTime={s.checkInTime}
            checkOutTime={s.checkOutTime}
            terms={s.termsText}
            roomTerms={Object.fromEntries(rooms.filter((r) => r.termsText).map((r) => [r.slug, r.termsText]))}
            marketingText={s.marketingOptInText}
            requireApproval={s.requireApproval}
          />
        </div>
      </section>
    </>
  );
}
