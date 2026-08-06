import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getPage, getSettings, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

const QUICK = [
  { icon: "/icons/gold-bed.png", label: "Stay", href: "/rooms/king-room" },
  { icon: "/icons/gold-dine.png", label: "Dine", href: "/bar" },
  { icon: "/icons/gold-meeting.png", label: "Meet", href: "/meeting-room" },
  { icon: "/icons/gold-celebrate.png", label: "Celebrate", href: "/celebrations" },
  { icon: "/icons/gold-marry.png", label: "Marry", href: "/weddings" },
];

const EAT = [
  { title: "Restaurant", img: "/uploads/restaurant.jpg" },
  { title: "Bar & Lounge", img: "/uploads/bar.jpg" },
  { title: "Afternoon Tea", img: "/uploads/afternoon-tea.jpg" },
];

const GLANCE = [
  { icon: "/icons/gold-bedroom.png", title: "Rooms" },
  { icon: "/icons/gold-tree.png", title: "Garden Space" },
  { icon: "/icons/gold-location.png", title: "Location" },
  { icon: "/icons/gold-parking.png", title: "Parking" },
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

      {/* 2 — Quick links strip */}
      <section className="bg-navy">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-5">
          {QUICK.map((q) => (
            <Link key={q.label} href={q.href}
              className="flex flex-col items-center gap-3 py-8 hover:bg-white/5 transition">
              <Image src={q.icon} alt="" width={52} height={52} className="h-12 w-12 object-contain" />
              <span className="nav-link text-gold text-xs sm:text-sm">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3 — Welcome (plain centred text) */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-navy font-semibold text-lg sm:text-xl mb-3">Welcome to</p>
          <h2 className="font-display text-3xl sm:text-5xl text-gold mb-8">The Paddocks Hotel</h2>
          <p className="text-lg leading-relaxed text-ink/80">{welcomeText}</p>
        </div>
      </section>

      {/* 4 — Relax & Unwind (image banner) */}
      <FeatureBanner
        image="/uploads/king-room.jpg" eyebrow="Book our rooms" title="Relax & Unwind"
        ctaLabel="Book Now" ctaHref={s.bookCtaHref} />

      {/* 5 — Eat & Drink (3 columns) */}
      <section className="py-16 sm:py-24 bg-cream">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl sm:text-5xl text-gold text-center mb-12">Eat &amp; Drink</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {EAT.map((e) => (
              <div key={e.title} className="text-center">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md mb-5">
                  <Image src={e.img} alt={e.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                </div>
                <h3 className="nav-link text-gold text-base">{e.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — Weddings (image banner) */}
      <FeatureBanner
        image="/uploads/weddings.jpg" eyebrow="Celebrate" title="Weddings"
        ctaLabel="Discover Now" ctaHref="/weddings" />

      {/* 7 — At a Glance (icon row) */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl sm:text-5xl text-gold text-center mb-14">At a Glance</h2>
          <div className="grid gap-10 grid-cols-2 lg:grid-cols-4 text-center">
            {GLANCE.map((g) => (
              <div key={g.title}>
                <Image src={g.icon} alt="" width={72} height={72} className="h-16 w-16 object-contain mx-auto mb-4" />
                <h3 className="nav-link text-navy text-sm">{g.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — Corporate & Private Events (image banner) */}
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
