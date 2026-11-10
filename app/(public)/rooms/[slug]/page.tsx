import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import { getRoom, getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/booking";
import { breadcrumbJsonLd, JsonLd, pageMetadata, roomJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [room, s] = await Promise.all([getRoom(slug), getSettings()]);
  if (!room) return {};
  return pageMetadata({
    settings: s,
    title: room.metaTitle || `${room.name} - ${s.siteName}`,
    description: room.metaDescription || room.shortDesc || s.metaDescription,
    keywords: room.keywords,
    path: `/rooms/${slug}`,
    image: room.heroImage,
  });
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [room, s] = await Promise.all([getRoom(slug), getSettings()]);
  if (!room) notFound();

  // Rooms that can be booked online go straight to the booking page for that room.
  const units = await prisma.roomUnit.count({ where: { roomId: room.id, active: true } });
  const builtinReady = s.bookingMode === "builtin" && room.bookable && room.basePrice > 0 && units > 0;
  const viaInnRoad = s.bookingMode === "innroad" && !!s.innRoadUrl;
  const online = builtinReady || viaInnRoad;
  const bookHref = online ? (builtinReady ? `/book?room=${room.slug}` : "/book") : s.bookCtaHref;
  const bookLabel = online ? "Check availability" : s.bookCtaLabel;

  return (
    <>
      <JsonLd data={roomJsonLd(s, room)} />
      <JsonLd data={breadcrumbJsonLd(s, [{ name: "Our Rooms", path: `/rooms/${room.slug}` }, { name: room.name, path: `/rooms/${room.slug}` }])} />
      <Hero
        eyebrow={room.heroEyebrow}
        title={room.name}
        image={room.heroImage}
        ctaLabel={bookLabel}
        ctaHref={bookHref}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          {room.showPrice && room.price && (
            <p className="text-2xl font-display text-gold mb-6">{room.price}</p>
          )}
          <div className="prose-body text-lg text-ink/80 leading-relaxed">
            {(room.description || room.shortDesc)
              .split("\n")
              .filter(Boolean)
              .map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {builtinReady && (
            <p className="mt-8 text-ink/70">From <span className="font-display text-2xl text-navy">{money(room.basePrice)}</span> a night</p>
          )}
          <a href={bookHref}
            className="inline-block mt-6 bg-navy text-white nav-link px-10 py-4 rounded-sm hover:bg-navy/90 transition">
            {bookLabel}
          </a>
        </div>
      </section>
    </>
  );
}
