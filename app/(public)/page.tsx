import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getPage, getRooms, getSettings, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [page, rooms, s] = await Promise.all([getPage("home"), getRooms(), getSettings()]);
  const sections = parseSections(page?.sectionsJson ?? "[]");

  return (
    <>
      <Hero
        eyebrow={page?.heroEyebrow}
        title={page?.heroTitle || s.siteName}
        subtitle={page?.heroSubtitle}
        image={page?.heroImage}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
        size="full"
      />

      {/* Intro sections */}
      {sections.map((sec, i) => (
        <section key={i} className="py-16 sm:py-20 bg-cream">
          <div className="mx-auto max-w-4xl px-6 text-center">
            {sec.heading && <h2 className="font-display text-3xl sm:text-4xl text-navy mb-5">{sec.heading}</h2>}
            {sec.body && <p className="text-lg leading-relaxed text-ink/80 max-w-2xl mx-auto">{sec.body}</p>}
          </div>
        </section>
      ))}

      {/* Rooms */}
      {rooms.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <p className="nav-link text-accent">Stay With Us</p>
              <h2 className="font-display text-4xl text-navy mt-2">Our Rooms</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <Link key={r.id} href={`/rooms/${r.slug}`}
                  className="group block overflow-hidden rounded-lg shadow-md bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {r.heroImage ? (
                      <Image src={r.heroImage} alt={r.name} fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width:768px) 100vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 bg-navy/10" />
                    )}
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="font-display text-2xl text-navy">{r.name}</h3>
                    {r.showPrice && r.price && <p className="text-accent font-semibold mt-1">{r.price}</p>}
                    <span className="nav-link text-tan mt-3 inline-block group-hover:text-accent">View Room →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
