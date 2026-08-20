import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PAGES as SEO_PAGES, ROOMS as SEO_ROOMS } from "./seo-content.mjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@paddockshotel.com";
const ADMIN_PASSWORD = "Paddocks2026!";

async function main() {
  // ── Admin ──
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  // update: {} - never overwrite an existing admin's password on re-seed / redeploy.
  await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: "Paddocks Admin", passwordHash },
  });

  // ── Site settings (single row) ──
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // ── Rooms ──
  const rooms = [
    { name: "King Room", slug: "king-room", image: "/uploads/king-room.jpg",
      desc: "Our most spacious room with a comfortable king-size bed, en-suite bathroom and beautiful views - perfect for couples looking to relax." },
    { name: "Double Room", slug: "double-room", image: "/uploads/double-room.jpg",
      desc: "A warm and welcoming double room with a plush double bed and all the comforts you need for a restful stay." },
    { name: "Family Room", slug: "family-room", image: "/uploads/family-room.jpg",
      desc: "Generous space for the whole family, with flexible bedding and a cosy, homely feel in the heart of Ross-on-Wye." },
    { name: "Twin Room", slug: "twin-room", image: "/uploads/twin-room.jpg",
      desc: "Two comfortable single beds, ideal for friends or colleagues travelling together, with a bright and airy layout." },
    { name: "Single Room", slug: "single-room", image: "/uploads/single-room.jpg",
      desc: "A snug, well-appointed single room - everything the solo traveller needs for a comfortable stay." },
  ];
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    await prisma.room.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        name: r.name, slug: r.slug, order: i, heroEyebrow: "Book Our",
        heroImage: r.image, price: "", showPrice: false,
        description: SEO_ROOMS[r.slug]?.description ?? r.desc,
        shortDesc: SEO_ROOMS[r.slug]?.shortDesc ?? r.desc,
        metaTitle: SEO_ROOMS[r.slug]?.metaTitle ?? `${r.name} - The Paddocks Hotel`,
        metaDescription: SEO_ROOMS[r.slug]?.metaDescription ?? r.desc,
        keywords: SEO_ROOMS[r.slug]?.keywords ?? "",
      },
    });
  }

  // ── Content pages ──
  const pages = [
    { slug: "home", title: "Home", navLabel: "HOME", navGroup: "", order: 0,
      heroEyebrow: "Welcome to", heroTitle: "PADDOCKS HOTEL",
      heroSubtitle: "In the heart of Ross-on-Wye", heroImage: "/uploads/home.jpg",
      sections: [
        { heading: "A warm welcome awaits", body: "The Paddocks Hotel offers comfortable rooms, memorable celebrations and authentic Indian dining in beautiful Symonds Yat West, Ross-on-Wye. Whether you're here to stay, celebrate or dine, we'll make you feel right at home.", image: "", imageSide: "right" },
      ] },
    { slug: "weddings", title: "Weddings", navLabel: "Weddings", navGroup: "explore", order: 1,
      heroEyebrow: "The Paddocks", heroTitle: "Weddings",
      heroSubtitle: "Celebrate your special day with us", heroImage: "/uploads/weddings.jpg",
      sections: [{ heading: "Your perfect day", body: "From intimate ceremonies to grand receptions, our team will help you create a wedding day to remember, with beautiful spaces, wonderful food and warm hospitality.", image: "", imageSide: "right" }] },
    { slug: "celebrations", title: "Celebrations", navLabel: "Celebrations", navGroup: "explore", order: 2,
      heroEyebrow: "The Paddocks", heroTitle: "Celebrations",
      heroSubtitle: "Birthdays, anniversaries & more", heroImage: "/uploads/celebrations.jpg",
      sections: [{ heading: "Every occasion, beautifully hosted", body: "Whatever you're celebrating, our flexible spaces and dedicated team make it effortless. Get in touch to plan your event.", image: "", imageSide: "right" }] },
    { slug: "dance", title: "Dance", navLabel: "Dance", navGroup: "explore", order: 3,
      heroEyebrow: "The Paddocks", heroTitle: "Dance",
      heroSubtitle: "Live music & dance nights", heroImage: "/uploads/dance.jpg",
      sections: [{ heading: "Dance the night away", body: "Join us for lively dance evenings and events in a wonderful setting. Contact us for the latest dates.", image: "", imageSide: "right" }] },
    { slug: "meeting-room", title: "Meeting Rooms", navLabel: "Meeting Rooms", navGroup: "explore", order: 4,
      heroEyebrow: "The Paddocks", heroTitle: "Meeting Rooms",
      heroSubtitle: "Space for business & events", heroImage: "/uploads/meeting-room.jpg",
      sections: [{ heading: "Meetings made easy", body: "Well-equipped rooms for business meetings, training and away-days, with catering available. Enquire about availability.", image: "", imageSide: "right" }] },
    { slug: "bar", title: "Bar", navLabel: "Bar", navGroup: "food", order: 5,
      heroEyebrow: "The Paddocks Hotel", heroTitle: "Our Bar",
      heroSubtitle: "Relax with a drink", heroImage: "/uploads/bar.jpg",
      sections: [{ heading: "Unwind at the bar", body: "A relaxed bar serving a great selection of drinks - the perfect spot before or after dinner.", image: "", imageSide: "right" }] },
    { slug: "explore", title: "Explore", navLabel: "EXPLORE", navGroup: "", order: 5,
      heroEyebrow: "Discover", heroTitle: "Explore",
      heroSubtitle: "The Wye Valley and Forest of Dean on your doorstep", heroImage: "/uploads/home.jpg",
      sections: [{ heading: "Things to do nearby", body: "We are lucky to sit right in the middle of one of the loveliest corners of the country. Here are some of our favourite places to visit, all within easy reach of the hotel.", image: "", imageSide: "right" }] },
    { slug: "contact", title: "Contact Us", navLabel: "CONTACT US", navGroup: "", order: 6,
      heroEyebrow: "The Paddocks", heroTitle: "Contact Us",
      heroSubtitle: "Indian restaurant in the heart of Ross-on-Wye", heroImage: "/uploads/contact.jpg",
      sections: [] },
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug, title: p.title, navLabel: p.navLabel, navGroup: p.navGroup,
        order: p.order, showInNav: p.slug !== "explore",
        heroImage: p.heroImage,
        heroEyebrow: SEO_PAGES[p.slug]?.heroEyebrow ?? p.heroEyebrow,
        heroTitle: SEO_PAGES[p.slug]?.heroTitle ?? p.heroTitle,
        heroSubtitle: SEO_PAGES[p.slug]?.heroSubtitle ?? p.heroSubtitle,
        sectionsJson: JSON.stringify(SEO_PAGES[p.slug]?.sections ?? p.sections),
        metaTitle: SEO_PAGES[p.slug]?.metaTitle ?? `${p.title} - The Paddocks Hotel`,
        metaDescription: SEO_PAGES[p.slug]?.metaDescription ?? p.heroSubtitle,
        keywords: SEO_PAGES[p.slug]?.keywords ?? "",
      },
    });
  }


  // ── Explore cards (things to do around Symonds Yat West) ──
  const explore = [
    { slug: "symonds-yat-rock", title: "Symonds Yat Rock", order: 1,
      link: "https://www.forestryengland.uk/symonds-yat-rock",
      desc: "The most famous view in the Wye Valley, looking down over the river as it loops through the gorge. Watch for peregrine falcons nesting on the cliffs." },
    { slug: "butterfly-zoo", title: "Wye Valley Butterfly Zoo", order: 2,
      link: "https://www.butterflyzoo.co.uk",
      desc: "A tropical hothouse of free-flying butterflies at the Wye Valley Visitor Centre, minutes up the road, with mini golf and a cafe on the same site." },
    { slug: "canoe-the-wye", title: "Canoeing on the Wye", order: 3,
      link: "https://www.wyevalleycanoes.co.uk",
      desc: "Hire a canoe, kayak or paddleboard and take to the river. Trips run from gentle half-days to full runs down to Monmouth." },
    { slug: "wye-valley-cruises", title: "River Cruises", order: 4,
      link: "https://www.wyevalleycruises.co.uk",
      desc: "A relaxed boat trip along the Wye with commentary on the wildlife and history of the gorge. No effort required." },
    { slug: "goodrich-castle", title: "Goodrich Castle", order: 5,
      link: "https://www.english-heritage.org.uk/visit/places/goodrich-castle/",
      desc: "A wonderfully complete medieval castle above the river, with a maze of towers and passages to climb. Around fifteen minutes away." },
    { slug: "puzzlewood", title: "Puzzlewood", order: 6,
      link: "https://www.puzzlewood.net",
      desc: "An otherworldly ancient woodland of mossy paths and twisted roots, used as a filming location for Star Wars and Doctor Who." },
    { slug: "clearwell-caves", title: "Clearwell Caves", order: 7,
      link: "https://www.clearwellcaves.com",
      desc: "Nine caverns of natural caves and iron mines worked for thousands of years, deep under the Forest of Dean." },
    { slug: "dean-forest-railway", title: "Dean Forest Railway", order: 8,
      link: "https://www.deanforestrailway.co.uk",
      desc: "A preserved steam railway running through the forest between Lydney and Parkend. Special events run right through the year." },
    { slug: "forest-cycling", title: "Cycling the Forest", order: 9,
      link: "https://www.pedalabikeaway.co.uk",
      desc: "Miles of family trails and mountain bike routes through the Forest of Dean, with bikes and e-bikes available to hire." },
    { slug: "tintern-abbey", title: "Tintern Abbey", order: 10,
      link: "https://cadw.gov.wales/visit/places-to-visit/tintern-abbey",
      desc: "The romantic ruins of a Cistercian abbey standing beside the Wye, a short and very scenic drive down the valley." },
    { slug: "hereford-cathedral", title: "Hereford Cathedral", order: 11,
      link: "https://www.herefordcathedral.org",
      desc: "Home to the Mappa Mundi and the Chained Library, two of the great treasures of medieval England. About half an hour north." },
  ];
  for (const e of explore) {
    await prisma.exploreItem.upsert({
      where: { slug: e.slug },
      update: {},
      create: {
        slug: e.slug, title: e.title, description: e.desc,
        linkUrl: e.link, buttonLabel: "View", order: e.order, image: "", published: true,
      },
    });
  }

  console.log("✅ Seeded: admin, settings,", rooms.length, "rooms,", pages.length, "pages,", explore.length, "explore cards");
  console.log("   Admin login:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
