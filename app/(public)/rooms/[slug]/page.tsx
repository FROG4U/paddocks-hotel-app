import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import { getRoom, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return {};
  return {
    title: room.metaTitle || `${room.name} — The Paddocks Hotel`,
    description: room.metaDescription || room.shortDesc,
  };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [room, s] = await Promise.all([getRoom(slug), getSettings()]);
  if (!room) notFound();

  return (
    <>
      <Hero
        eyebrow={room.heroEyebrow}
        title={room.name}
        image={room.heroImage}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          {room.showPrice && room.price && (
            <p className="text-2xl font-display text-accent mb-6">{room.price}</p>
          )}
          <div className="prose-body text-lg text-ink/80 leading-relaxed">
            {(room.description || room.shortDesc)
              .split("\n")
              .filter(Boolean)
              .map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <a href={s.bookCtaHref}
            className="inline-block mt-10 bg-navy text-white nav-link px-10 py-4 rounded-sm hover:bg-navy/90 transition">
            {s.bookCtaLabel}
          </a>
        </div>
      </section>
    </>
  );
}
