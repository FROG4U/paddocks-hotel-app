import type { Metadata } from "next";
import BookingWidget from "@/components/BookingWidget";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { stripeConfigured } from "@/lib/stripe";

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
  { searchParams: Promise<{ room?: string; cancelled?: string }> }) {
  const { room, cancelled } = await searchParams;
  const [s, rooms, mealPlans] = await Promise.all([
    getSettings(),
    prisma.room.findMany({
      where: { bookable: true, basePrice: { gt: 0 }, units: { some: { active: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.mealPlan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <section className="bg-navy text-white text-center pt-16 pb-14 px-6">
        <p className="eyebrow">Book direct for the best price</p>
        <h1 className="hero-title mt-3">Book a Room</h1>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-12 lg:py-16">
          <BookingWidget
            rooms={rooms.map((r) => ({
              slug: r.slug, name: r.name, image: r.heroImage, maxGuests: r.maxGuests,
              basePrice: r.basePrice, shortDesc: r.shortDesc,
            }))}
            mealPlans={mealPlans.map((m) => ({
              id: m.id, name: m.name, description: m.description,
              breakfast: m.breakfast, lunch: m.lunch, dinner: m.dinner,
              pricePerPerson: m.pricePerPerson, childPrice: m.childPrice,
            }))}
            initialRoom={room && rooms.some((r) => r.slug === room) ? room : ""}
            phone={s.phone}
            paymentsOn={stripeConfigured()}
            cancelled={cancelled === "1"}
          />
        </div>
      </section>
    </>
  );
}
