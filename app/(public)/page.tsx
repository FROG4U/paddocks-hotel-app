import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getPage, getRooms, getSettings, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

const QUICK = [
  { icon: "/icons/bed.png", label: "Stay", href: "/rooms/king-room" },
  { icon: "/icons/dine.png", label: "Dine", href: "/bar" },
  { icon: "/icons/meeting.png", label: "Meet", href: "/meeting-room" },
  { icon: "/icons/celebrate.png", label: "Celebrate", href: "/celebrations" },
  { icon: "/icons/marry.png", label: "Marry", href: "/weddings" },
];

const EAT = [
  { title: "Restaurant", img: "/uploads/restaurant.jpg", text: "Authentic Indian dining in a warm, welcoming setting." },
  { title: "Bar & Lounge", img: "/uploads/bar.jpg", text: "Relax with a drink before or after your meal." },
  { title: "Afternoon Tea", img: "/uploads/afternoon-tea.jpg", text: "A classic afternoon tea, served with a smile." },
];

const GLANCE = [
  { icon: "/icons/bed.png", title: "Rooms", text: "Comfortable, well-appointed rooms for a restful stay." },
  { icon: "/icons/tree.png", title: "Garden Space", text: "Relax outdoors with lovely countryside views." },
  { icon: "/icons/location.png", title: "Location", text: "A short stroll from the River Wye at Symonds Yat West." },
  { icon: "/icons/parking.png", title: "Parking", text: "Free on-site parking for all our guests." },
];

const WELCOME_TEXT =
  "The Paddocks Hotel is the perfect choice for your next UK break, located just a short stroll from the banks of the River Wye in the picturesque Wye Valley. World-renowned for its beauty with river and forest walks on the doorstep, here you really can escape to the country. The perfect base if you plan on exploring, getting involved in river activities, or simply enjoying nature.";

export default async function HomePage() {
  const [page, rooms, s] = await Promise.all([getPage("home"), getRooms(), getSettings()]);
  const sections = parseSections(page?.sectionsJson ?? "[]");
  const welcomeText = sections[0]?.body?.length ? sections[0].body : WELCOME_TEXT;

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

      {/* Quick links */}
      <section className="bg-navy">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 sm:grid-cols-5 divide-x divide-white/10">
          {QUICK.map((q) => (
            <Link key={q.label} href={q.href}
              className="flex flex-col items-center gap-2 py-6 text-gold hover:bg-white/5 transition">
              <Image src={q.icon} alt="" width={44} height={44} className="h-10 w-10 object-contain brightness-0 invert opacity-90" />
              <span className="nav-link text-xs">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Welcome intro */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 grid gap-12 md:grid-cols-2 items-center">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-lg order-1 md:order-none">
            <Image src="/uploads/king-room.jpg" alt="The Paddocks Hotel" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
          </div>
          <div>
            <p className="nav-link text-accent">Welcome to</p>
            <h2 className="font-display text-4xl text-navy mt-2 mb-6">The Paddocks Hotel</h2>
            <p className="text-lg leading-relaxed text-ink/80">{welcomeText}</p>
            <Link href="/contact" className="inline-block mt-8 bg-navy text-white nav-link px-8 py-3.5 rounded-sm hover:bg-navy/90">
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* Relax & Unwind — rooms */}
      {rooms.length > 0 && (
        <section className="py-16 sm:py-24 bg-cream">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <p className="nav-link text-accent">Book our rooms</p>
              <h2 className="font-display text-4xl sm:text-5xl text-navy mt-2">Relax &amp; Unwind</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <Link key={r.id} href={`/rooms/${r.slug}`}
                  className="group block overflow-hidden rounded-lg shadow-md bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {r.heroImage
                      ? <Image src={r.heroImage} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:768px) 100vw, 33vw" />
                      : <div className="absolute inset-0 bg-navy/10" />}
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="font-display text-2xl text-navy">{r.name}</h3>
                    {r.showPrice && r.price && <p className="text-accent font-semibold mt-1">{r.price}</p>}
                    <span className="nav-link text-tan mt-3 inline-block group-hover:text-accent">View Room →</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href={s.bookCtaHref} className="inline-block bg-tan text-navy nav-link px-10 py-4 rounded-sm hover:brightness-95">
                {s.bookCtaLabel}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Eat & Drink */}
      <section className="py-16 sm:py-24 bg-navy text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="nav-link text-gold">Food &amp; Bar</p>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Eat &amp; Drink</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {EAT.map((e) => (
              <div key={e.title} className="bg-white text-ink rounded-lg overflow-hidden shadow-lg">
                <div className="relative aspect-[4/3]">
                  <Image src={e.img} alt={e.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                </div>
                <div className="p-6 text-center">
                  <h3 className="font-display text-2xl text-navy">{e.title}</h3>
                  <p className="text-ink/70 mt-2 text-sm leading-relaxed">{e.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weddings feature banner */}
      <FeatureBanner
        image="/uploads/weddings.jpg" eyebrow="Celebrate" title="Weddings"
        text="Say your vows in the heart of the beautiful Wye Valley. Let our team help you create a wedding day to remember."
        ctaLabel="Discover Weddings" ctaHref="/weddings" />

      {/* At a Glance */}
      <section className="py-16 sm:py-24 bg-cream">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="nav-link text-accent">The Paddocks</p>
            <h2 className="font-display text-4xl text-navy mt-2">At a Glance</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {GLANCE.map((g) => (
              <div key={g.title}>
                <div className="mx-auto w-20 h-20 rounded-full bg-navy grid place-items-center mb-4">
                  <Image src={g.icon} alt="" width={40} height={40} className="h-9 w-9 object-contain brightness-0 invert" />
                </div>
                <h3 className="font-display text-xl text-navy">{g.title}</h3>
                <p className="text-ink/70 text-sm mt-2 leading-relaxed">{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate & Private Events */}
      <FeatureBanner
        image="/uploads/meeting-room.jpg" eyebrow="Host with us" title="Corporate & Private Events"
        text="From business meetings to private parties, our flexible spaces and dedicated team have you covered."
        ctaLabel="Discover Events" ctaHref="/meeting-room" />
    </>
  );
}

function FeatureBanner({ image, eyebrow, title, text, ctaLabel, ctaHref }: {
  image: string; eyebrow: string; title: string; text: string; ctaLabel: string; ctaHref: string;
}) {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <Image src={image} alt={title} fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-navy/70" />
      </div>
      <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32 text-center text-white">
        <p className="nav-link text-gold">{eyebrow}</p>
        <h2 className="hero-title text-4xl sm:text-6xl my-4">{title}</h2>
        <p className="text-lg text-white/90 max-w-2xl mx-auto">{text}</p>
        <Link href={ctaHref} className="inline-block mt-8 bg-tan text-navy nav-link px-10 py-4 rounded-sm hover:brightness-95">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
