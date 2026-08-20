import type { Metadata } from "next";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getExploreItems, getPage, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("explore");
  return {
    title: page?.metaTitle || "Explore the Area - The Paddocks Hotel",
    description:
      page?.metaDescription ||
      "Things to see and do around The Paddocks Hotel: Symonds Yat Rock, the River Wye, the Forest of Dean, castles, caves and more.",
  };
}

// Cards cycle through three band colours, like the rest of the brand.
const BANDS = [
  { bg: "bg-ink", text: "text-white", sub: "text-white/75", btn: "bg-gold text-navy" },
  { bg: "bg-gold", text: "text-navy", sub: "text-navy/75", btn: "bg-navy text-white" },
  { bg: "bg-navy", text: "text-white", sub: "text-white/75", btn: "bg-gold text-navy" },
];

export default async function ExplorePage() {
  const [items, page] = await Promise.all([getExploreItems(), getPage("explore")]);
  const sections = parseSections(page?.sectionsJson ?? "[]");
  const intro = sections[0]?.body;

  return (
    <>
      <Hero
        eyebrow={page?.heroEyebrow || "Discover"}
        title={page?.heroTitle || "Explore"}
        subtitle={page?.heroSubtitle || "The Wye Valley and Forest of Dean on your doorstep"}
        image={page?.heroImage || "/uploads/home.jpg"}
      />

      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pt-[70px] lg:pt-[102px] pb-10 text-center">
          <h2 className="section-title mb-6">Things to do nearby</h2>
          <p className="mx-auto max-w-[958px] text-base lg:text-[18px] leading-[22px] lg:leading-[28px] text-black">
            {intro ||
              "We are lucky to sit right in the middle of one of the loveliest corners of the country. Here are some of our favourite places to visit, all within easy reach of the hotel."}
          </p>
        </div>
      </section>

      <section className="bg-white pb-[80px] lg:pb-[112px]">
        <div className="mx-auto max-w-[1140px] px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const band = BANDS[i % BANDS.length];
            return (
              <article key={item.id} className="flex flex-col h-full overflow-hidden shadow-md">
                <div className={`relative w-full aspect-[4/3] ${item.image ? "" : "bg-cream"}`}>
                  {item.image ? (
                    <Image src={item.image} alt={item.title} fill className="object-cover"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 360px" />
                  ) : (
                    // No photo uploaded yet - show the brand mark rather than a blank box.
                    <div className="absolute inset-0 grid place-items-center">
                      <Image src="/brand/logo.png" alt="" width={160} height={92}
                        className="h-16 w-auto object-contain opacity-25" />
                    </div>
                  )}
                </div>

                <div className={`flex flex-col flex-1 px-6 py-7 ${band.bg}`}>
                  <h3 className={`font-display text-2xl uppercase ${band.text}`}>{item.title}</h3>
                  {item.description && (
                    <p className={`mt-3 text-[0.95rem] leading-relaxed ${band.sub}`}>{item.description}</p>
                  )}
                  {item.linkUrl && (
                    <div className="mt-auto pt-6">
                      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer"
                        className={`inline-flex items-center font-[family-name:var(--font-archivo)] font-extrabold text-sm uppercase px-8 py-3 ${band.btn} hover:brightness-95 transition`}>
                        <span>{item.buttonLabel || "View"}</span>
                        <span aria-hidden="true" className="ml-2">&rarr;</span>
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {items.length === 0 && (
          <p className="text-center text-ink/60">Places to explore will appear here soon.</p>
        )}
      </section>
    </>
  );
}
