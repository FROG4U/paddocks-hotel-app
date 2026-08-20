import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Hero from "@/components/Hero";
import ContactForm from "@/components/ContactForm";
import WeddingPackages from "@/components/WeddingPackages";
import { getPage, getSettings, parseSections } from "@/lib/data";
import { breadcrumbJsonLd, JsonLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [page, s] = await Promise.all([getPage(slug), getSettings()]);
  if (!page || slug === "home") return {};
  return pageMetadata({
    settings: s,
    title: page.metaTitle || `${page.title} - ${s.siteName}`,
    description: page.metaDescription || page.heroSubtitle || s.metaDescription,
    keywords: page.keywords,
    path: `/${slug}`,
    image: page.heroImage,
  });
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "home") notFound(); // home is served at "/"
  const [page, s] = await Promise.all([getPage(slug), getSettings()]);
  if (!page) notFound();

  const sections = parseSections(page.sectionsJson);
  const isContact = slug === "contact";
  const isWeddings = slug === "weddings";
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&t=m&z=15&output=embed&iwloc=near`;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(s, [{ name: page.title, path: `/${slug}` }])} />
      <Hero
        eyebrow={page.heroEyebrow}
        title={page.heroTitle || page.title}
        subtitle={page.heroSubtitle}
        image={page.heroImage}
      />

      {sections.map((sec, i) => {
        const hasImg = !!sec.image;
        const left = sec.imageSide === "left";
        return (
          <section key={i} className={i % 2 ? "bg-cream" : "bg-white"}>
            <div className={`mx-auto max-w-5xl px-6 py-16 grid gap-10 items-center ${hasImg ? "md:grid-cols-2" : ""}`}>
              {hasImg && left && (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow">
                  <Image src={sec.image!} alt={sec.heading || page.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                </div>
              )}
              <div className={hasImg ? "" : "text-center max-w-2xl mx-auto"}>
                {sec.heading && <h2 className="font-display text-3xl text-navy mb-4">{sec.heading}</h2>}
                {sec.body && (
                  <div className="prose-body text-lg text-ink/80">
                    {sec.body.split("\n").filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                )}
              </div>
              {hasImg && !left && (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow">
                  <Image src={sec.image!} alt={sec.heading || page.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Wedding packages (from the hotel's wedding brochure) */}
      {isWeddings && <WeddingPackages ctaHref="/contact" />}

      {/* Contact block: details + map */}
      {isContact && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-2 items-start">
            <div>
              <h2 className="font-display text-3xl text-navy mb-6">Find Us Here</h2>
              <address className="not-italic text-lg leading-relaxed text-ink/80">
                {s.addressLine1}<br />{s.addressLine2}<br />{s.town} {s.postcode}
              </address>
              <div className="mt-6 space-y-1 text-lg">
                <p><span className="text-gold font-semibold">Tel:</span> <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-navy">{s.phone}</a></p>
                <p><span className="text-gold font-semibold">Email:</span> <a href={`mailto:${s.email}`} className="hover:text-navy">{s.email}</a></p>
              </div>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow">
              <iframe title="Map" src={mapSrc} className="absolute inset-0 w-full h-full border-0" loading="lazy" />
            </div>
          </div>

          <div className="mx-auto max-w-3xl px-6 mt-16">
            <h2 className="section-title text-center mb-8">Send us a message</h2>
            <ContactForm />
          </div>
        </section>
      )}
    </>
  );
}
