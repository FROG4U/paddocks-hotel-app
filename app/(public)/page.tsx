import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getPage, getSettings, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

const EAT = [
  { title: "Restaurant", img: "/uploads/restaurant.jpg" },
  { title: "Bar & Lounge", img: "/uploads/bar.jpg" },
  { title: "Afternoon Tea", img: "/uploads/afternoon-tea.jpg" },
];

const GLANCE = [
  { icon: "/icons/bed.png", title: "Rooms" },
  { icon: "/icons/tree.png", title: "Garden Space" },
  { icon: "/icons/location.png", title: "Location" },
  { icon: "/icons/parking.png", title: "Parking" },
];

const WELCOME_TEXT =
  "The Paddocks Hotel is the perfect choice for your next UK break, located just a short stroll from the banks of the River Wye in the picturesque Wye Valley. World-renowned for its beauty with river and forest walks on the doorstep, here you really can escape to the country. The perfect base if you plan on exploring, getting involved in river activities, or simply enjoying nature.";

export default async function HomePage() {
  const [page, s] = await Promise.all([getPage("home"), getSettings()]);
  const sections = parseSections(page?.sectionsJson ?? "[]");
  const welcomeText = sections[0]?.body?.length ? sections[0].body : WELCOME_TEXT;

  return (
    <>
      {/* 1 — Hero */}
      <Hero
        eyebrow={page?.heroEyebrow}
        title={page?.heroTitle || s.siteName}
        subtitle={page?.heroSubtitle}
        image={page?.heroImage}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
        size="full"
      />

      {/* 2 — Welcome (plain centred text) */}
      <section className="py-20 sm:py-28 bg-cream">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="nav-link text-gold">Welcome to</p>
          <h2 className="font-display text-3xl sm:text-5xl text-navy mt-3 mb-8">The Paddocks Hotel</h2>
          <p className="text-lg leading-relaxed text-ink/80">{welcomeText}</p>
        </div>
      </section>

      {/* 3 — Relax & Unwind (image banner) */}
      <FeatureBanner
        image="/uploads/king-room.jpg" eyebrow="Book our rooms" title="Relax & Unwind"
        ctaLabel="Book Now" ctaHref={s.bookCtaHref} />

      {/* 4 — Eat & Drink (3 columns) */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl sm:text-5xl text-navy text-center mb-12">Eat &amp; Drink</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {EAT.map((e) => (
              <div key={e.title} className="text-center">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-md mb-5">
                  <Image src={e.img} alt={e.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                </div>
                <h3 className="font-display text-2xl text-navy">{e.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Weddings (image banner) */}
      <FeatureBanner
        image="/uploads/weddings.jpg" eyebrow="Celebrate" title="Weddings"
        ctaLabel="Discover Now" ctaHref="/weddings" />

      {/* 6 — At a Glance (icon row) */}
      <section className="py-16 sm:py-24 bg-cream">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl sm:text-5xl text-navy text-center mb-14">At a Glance</h2>
          <div className="grid gap-10 grid-cols-2 lg:grid-cols-4 text-center">
            {GLANCE.map((g) => (
              <div key={g.title}>
                <div className="mx-auto w-24 h-24 rounded-full bg-navy grid place-items-center mb-5">
                  <Image src={g.icon} alt="" width={44} height={44} className="h-11 w-11 object-contain brightness-0 invert" />
                </div>
                <h3 className="font-display text-xl text-navy">{g.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — Corporate & Private Events (image banner) */}
      <FeatureBanner
        image="/uploads/corporate.jpg" eyebrow="Celebrate" title="Corporate & Private Events"
        ctaLabel="Discover Now" ctaHref="/meeting-room" />
    </>
  );
}

function FeatureBanner({ image, eyebrow, title, ctaLabel, ctaHref }: {
  image: string; eyebrow: string; title: string; ctaLabel: string; ctaHref: string;
}) {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <Image src={image} alt={title} fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-28 sm:py-36 text-center text-white [text-shadow:0_2px_10px_rgba(0,0,0,.55)]">
        <p className="nav-link text-gold">{eyebrow}</p>
        <h2 className="hero-title text-4xl sm:text-6xl uppercase my-4">{title}</h2>
        <Link href={ctaHref} className="inline-block mt-6 bg-tan text-navy nav-link px-10 py-4 rounded-sm hover:brightness-95">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
