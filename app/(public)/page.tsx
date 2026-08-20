import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import { getPage, getSettings, parseSections } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Home page - a section-for-section copy of the original design at
 * paddock.frog4u.com: type sizes, capitalisation, colours, image crops and
 * section heights all match the original.
 */

const QUICK = [
  { icon: "/icons/gold-bed.png", label: "Stay", href: "/rooms/king-room" },
  { icon: "/icons/gold-dine.png", label: "Dine", href: "/bar" },
  { icon: "/icons/gold-meeting.png", label: "Meet", href: "/meeting-room" },
  { icon: "/icons/gold-celebrate.png", label: "Celebrate", href: "/celebrations" },
  { icon: "/icons/gold-marry.png", label: "Marry", href: "/weddings" },
];

// The original uses these three photos, in this order.
const EAT = [
  { title: "Restaurant", img: "/uploads/takeaway.png" },
  { title: "Bar & Lounge", img: "/uploads/reservation.png" },
  { title: "Afternoon Tea", img: "/uploads/afternoon-tea.jpg" },
];

const GLANCE = [
  {
    icon: "/icons/gold-bedroom.png",
    title: "Bed Rooms",
    text: "Comfortable, quiet en-suite rooms with everything you need to unwind - sink into a proper bed after a day out in the Wye Valley.",
  },
  {
    icon: "/icons/gold-tree.png",
    title: "Garden Space",
    text: "Lawns, a gazebo and a pretty terrace - a lovely outdoor setting for wedding ceremonies, drinks receptions, parties and summer events.",
  },
  {
    icon: "/icons/gold-location.png",
    title: "Location",
    text: "In Symonds Yat West, midway between Ross-on-Wye and Monmouth, with the River Wye, Symonds Yat Rock and the Forest of Dean on the doorstep.",
  },
  {
    icon: "/icons/gold-parking.png",
    title: "Parking",
    text: "Plenty of free parking right outside for guests and events - arrive, park up and leave the car where it is until you head home again.",
  },
];

const WELCOME_TEXT =
  "The Paddocks Hotel is the perfect choice for your next UK break, located just a short stroll from the banks of the River Wye in the picturesque Wye Valley. World-renowned for its beauty with river and forest walks on the doorstep, here you really can escape to the country. The perfect base if you plan on exploring, getting involved in river activities, or simply enjoying nature.";

export default async function HomePage() {
  const [page, s] = await Promise.all([getPage("home"), getSettings()]);
  const sections = parseSections(page?.sectionsJson ?? "[]");
  const welcomeText = sections[0]?.body?.length ? sections[0].body : WELCOME_TEXT;

  return (
    <>
      {/* 1 - Hero (full viewport height) */}
      <Hero
        eyebrow={page?.heroEyebrow}
        title={page?.heroTitle || s.siteName}
        subtitle={page?.heroSubtitle}
        image={page?.heroImage}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
        size="full"
      />

      {/* 2 - Quick links strip (navy, 147px tall on desktop) */}
      <section className="bg-navy px-[10px]">
        <div className="mx-auto max-w-[756px] flex flex-wrap justify-center gap-y-5 gap-x-[5px] pt-5 pb-[18px]">
          {QUICK.map((q) => (
            <Link key={q.label} href={q.href}
              className="flex flex-col items-center w-1/3 sm:w-auto sm:flex-1 px-1 hover:opacity-80 transition">
              <Image src={q.icon} alt="" width={202} height={202}
                className="h-[101px] w-[101px] lg:h-[76px] lg:w-[76px] object-contain" />
              <span className="caption-title">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3 - Welcome */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1140px] px-6 pt-[70px] pb-[80px] lg:pt-[102px] lg:pb-[117px] text-center flex flex-col gap-5">
          <p className="eyebrow text-navy">Welcome to</p>
          {/* The original breaks this headline over two lines */}
          <h2 className="section-title">The Paddocks<br />Hotel</h2>
          <p className="mx-auto max-w-[958px] text-base lg:text-[18px] leading-[22px] lg:leading-[28px] text-black">
            {welcomeText}
          </p>
        </div>
      </section>

      {/* 4 - Relax & Unwind */}
      <Hero image="/uploads/king-room.jpg" eyebrow="Book our rooms" title="Relax & Unwind"
        ctaLabel="Book Now" ctaHref={s.bookCtaHref} />

      {/* 5 - Eat & Drink (cream) */}
      <section className="bg-cream px-6 lg:px-16">
        <div className="mx-auto max-w-[1140px] pt-[90px] pb-[112px] text-center">
          <h2 className="section-title">Eat &amp; Drink</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {EAT.map((e) => (
              <div key={e.title}>
                <div className="relative w-full aspect-[340/417] overflow-hidden">
                  <Image src={e.img} alt={e.title} fill className="object-cover" sizes="(max-width:640px) 100vw, 340px" />
                </div>
                <h3 className="caption-title caption-title-lg mt-5">{e.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 - Weddings */}
      <Hero image="/uploads/weddings.jpg" eyebrow="Celebrate" title="Weddings"
        ctaLabel="Discover Now" ctaHref="/weddings" />

      {/* 7 - At a Glance (navy) */}
      <section className="bg-navy">
        <div className="mx-auto max-w-[1140px] px-6 pt-[51px] text-center">
          <h2 className="section-title">At a Glance</h2>
        </div>
        <div className="mx-auto max-w-[975px] px-4 sm:px-0 pb-[51px] pt-[10px]
          flex flex-wrap justify-center gap-y-10 gap-x-[10px] text-center">
          {GLANCE.map((g) => (
            <div key={g.title} className="w-full sm:w-[236px] px-[10px]">
              <Image src={g.icon} alt="" width={174} height={174}
                className="h-[87px] w-[87px] object-contain mx-auto" />
              <h3 className="caption-title mt-5">{g.title}</h3>
              <p className="text-white text-base leading-[22px] mt-5">{g.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8 - Corporate & Private Events */}
      <Hero image="/uploads/corporate.jpg" eyebrow="Celebrate" title={"Corporate &\nPrivate Events"}
        ctaLabel="Discover Now" ctaHref="/meeting-room" />
    </>
  );
}
