import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@paddockshotel.com";
const ADMIN_PASSWORD = "Paddocks2026!";

async function main() {
  // ── Admin ──
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  // update: {} — never overwrite an existing admin's password on re-seed / redeploy.
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
      desc: "Our most spacious room with a comfortable king-size bed, en-suite bathroom and beautiful views — perfect for couples looking to relax." },
    { name: "Double Room", slug: "double-room", image: "/uploads/double-room.jpg",
      desc: "A warm and welcoming double room with a plush double bed and all the comforts you need for a restful stay." },
    { name: "Family Room", slug: "family-room", image: "/uploads/family-room.jpg",
      desc: "Generous space for the whole family, with flexible bedding and a cosy, homely feel in the heart of Ross-on-Wye." },
    { name: "Twin Room", slug: "twin-room", image: "/uploads/twin-room.jpg",
      desc: "Two comfortable single beds, ideal for friends or colleagues travelling together, with a bright and airy layout." },
    { name: "Single Room", slug: "single-room", image: "/uploads/single-room.jpg",
      desc: "A snug, well-appointed single room — everything the solo traveller needs for a comfortable stay." },
  ];
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    await prisma.room.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        name: r.name, slug: r.slug, order: i, heroEyebrow: "Book Our",
        heroImage: r.image, description: r.desc, shortDesc: r.desc,
        price: "", showPrice: false,
        metaTitle: `${r.name} — The Paddocks Hotel`,
        metaDescription: r.desc,
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
      sections: [{ heading: "Unwind at the bar", body: "A relaxed bar serving a great selection of drinks — the perfect spot before or after dinner.", image: "", imageSide: "right" }] },
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
        order: p.order, showInNav: true,
        heroEyebrow: p.heroEyebrow, heroTitle: p.heroTitle,
        heroSubtitle: p.heroSubtitle, heroImage: p.heroImage,
        sectionsJson: JSON.stringify(p.sections),
        metaTitle: `${p.title} — The Paddocks Hotel`,
        metaDescription: p.heroSubtitle,
      },
    });
  }

  console.log("✅ Seeded: admin, settings,", rooms.length, "rooms,", pages.length, "pages");
  console.log("   Admin login:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
