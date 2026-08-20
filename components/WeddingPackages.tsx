import Link from "next/link";

// Wedding packages exactly as set out in the hotel's wedding brochure.
type Pkg = {
  name: string;
  guests: string;
  price: string;
  blurb: string;
  note?: string;
  groups: { title?: string; items: string[] }[];
  featured?: boolean;
};

const PACKAGES: Pkg[] = [
  {
    name: "Classic Package",
    guests: "For up to 80 guests",
    price: "£6,500",
    blurb:
      "A warm and welcoming reception package offering great value while still giving you exclusive use of the hotel and a beautifully dressed ballroom.",
    groups: [
      {
        title: "What's Included",
        items: [
          "Exclusive use of the hotel from 12pm on the wedding day until 11am the next day",
          "Complimentary Bridal Suite including breakfast",
          "10% discount on guest bedrooms (booked direct)",
          "Ballroom dressed in white — tables & chairs",
          "Welcome drink (prosecco or orange juice)",
          "Two-course hot buffet wedding breakfast",
          "Glass of prosecco per person to toast",
          "Cake stand & knife",
          "Evening cold finger buffet for 80 guests",
        ],
      },
    ],
  },
  {
    name: "Signature Package",
    guests: "For up to 80 guests",
    price: "£8,000",
    blurb:
      "A simple, elegant reception package offering everything you need for a relaxed and memorable celebration.",
    featured: true,
    groups: [
      {
        title: "What's Included",
        items: [
          "Exclusive use of the hotel from 7am on the wedding day",
          "Exclusive use of the ballroom from 4pm the day before for set-up",
          "10% discount on guest bedrooms (booked direct)",
          "Ballroom dressed in white — tables & chairs",
          "Welcome drinks for 80 guests (prosecco or orange juice)",
          "Three-course wedding breakfast",
          "Glass of prosecco for toast",
          "Bridal Suite on the wedding night including breakfast",
          "Evening buffet for 80 guests (additional guests charged per head)",
        ],
      },
    ],
  },
  {
    name: "Premium Package",
    guests: "For up to 70 guests",
    price: "£15,000",
    blurb:
      "Our most complete all-in wedding experience, perfect for couples who want everything taken care of. For up to 70 day/evening guests, with exclusive use of the entire venue from the day before the ceremony.",
    note: "All of this included and so much more.",
    groups: [
      {
        title: "Ceremony",
        items: ["Wedding ceremony for 70 guests (indoors or outdoors)"],
      },
      {
        title: "Accommodation",
        items: [
          "Complimentary Bridal Suite for the wedding night including breakfast",
          "25 guest bedrooms to accommodate friends and family",
        ],
      },
      {
        title: "Wedding Reception",
        items: [
          "Welcome drink of prosecco or juice",
          "Three-course set menu wedding breakfast",
          "Glass of prosecco for toast",
          "Evening buffet for 70 guests (additional guests charged per head)",
        ],
      },
    ],
  },
];

function Tick() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true"
      className="mt-[3px] h-4 w-4 flex-none text-gold">
      <path fill="currentColor"
        d="M7.6 14.6 3.4 10.4l1.5-1.5 2.7 2.7 7-7 1.5 1.5z" />
    </svg>
  );
}

export default function WeddingPackages({ ctaHref = "/contact" }: { ctaHref?: string }) {
  return (
    <section id="wedding-packages" className="bg-cream py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <header className="text-center max-w-2xl mx-auto mb-14">
          <p className="nav-link text-navy mb-2">Your perfect wedding venue</p>
          <h2 className="font-display text-3xl sm:text-5xl text-gold uppercase mb-6">
            Wedding Packages
          </h2>
          <p className="text-lg leading-relaxed text-ink/80">
            Here at The Paddocks we tailor our wedding packages to fit each couple. We can offer
            packages at all price points and work closely with our couples to ensure the best price
            on their special day.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <article key={p.name}
              className={`flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-md ${
                p.featured ? "ring-2 ring-gold" : ""
              }`}>
              {/* Navy header band with the price */}
              <div className="bg-navy text-center px-6 py-8 flex flex-col justify-center min-h-[15rem]">
                <h3 className="font-display text-2xl text-gold uppercase">{p.name}</h3>
                <p className="nav-link text-white/80 mt-3">{p.guests}</p>
                <p className="mt-4 text-white/70 text-sm">starting from</p>
                <p className="font-display text-4xl sm:text-5xl text-white">{p.price}</p>
              </div>

              <div className="flex flex-col flex-1 px-6 sm:px-8 py-8">
                <p className="text-ink/80 leading-relaxed mb-6">{p.blurb}</p>

                {p.groups.map((g) => (
                  <div key={g.title ?? "items"} className="mb-6 last:mb-0">
                    {g.title && (
                      <h4 className="nav-link text-navy mb-3 pb-2 border-b border-gold/40">
                        {g.title}
                      </h4>
                    )}
                    <ul className="space-y-2.5">
                      {g.items.map((item) => (
                        <li key={item} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink/80">
                          <Tick />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {p.note && <p className="text-navy font-semibold mt-2">{p.note}</p>}

                <div className="mt-auto pt-8">
                  <Link href={ctaHref}
                    className="block text-center bg-tan text-navy nav-link px-6 py-3.5 rounded-sm hover:brightness-95 transition">
                    Enquire Now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="text-center text-ink/70 mt-12 max-w-2xl mx-auto">
          Every wedding is different — packages can be tailored to your day and your budget. Please
          get in touch for full details and to arrange a viewing.
        </p>
      </div>
    </section>
  );
}
