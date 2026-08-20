// Search-optimised copy for every page and room. seed.mjs uses this when it
// creates a fresh database; running this file directly with --apply pushes the
// copy into an existing database (it overwrites, so use it deliberately).
import { PrismaClient } from "@prisma/client";

export const PAGES = {
  home: {
    metaTitle: "The Paddocks Hotel | Hotel & Restaurant, Ross-on-Wye",
    metaDescription:
      "A family-run hotel and Indian restaurant in Symonds Yat West, Ross-on-Wye. En-suite rooms, weddings and parties in the Wye Valley. Call 01600 890 246.",
    keywords:
      "hotel Ross-on-Wye, Symonds Yat hotel, hotel Symonds Yat West, Wye Valley hotel, Forest of Dean hotel, bed and breakfast Ross-on-Wye, places to stay Wye Valley",
    sections: [{
      heading: "Welcome to",
      body: "The Paddocks Hotel is a family-run hotel in Symonds Yat West, just outside Ross-on-Wye and a short stroll from the banks of the River Wye. Our en-suite rooms, restaurant, bar and function rooms sit in the heart of the Wye Valley, with river and forest walks starting on the doorstep and the Forest of Dean just across the water. Whether you are here for a weekend in the countryside, a wedding, a family celebration or a business meeting, you will find a warm welcome, easy parking and one of the loveliest corners of Herefordshire waiting outside.",
      image: "", imageSide: "right",
    }],
  },
  weddings: {
    metaTitle: "Wedding Venue in Ross-on-Wye | The Paddocks Hotel",
    metaDescription:
      "Licensed wedding venue near Ross-on-Wye in the Wye Valley. Ceremonies indoors or in the gardens, a ballroom seating 200 and packages from £6,500.",
    keywords:
      "wedding venue Ross-on-Wye, Wye Valley wedding venue, wedding venue Herefordshire, Symonds Yat wedding venue, wedding packages Ross-on-Wye, licensed wedding venue Forest of Dean, country wedding venue Herefordshire",
    heroTitle: "Weddings", heroEyebrow: "Celebrate",
    heroSubtitle: "A licensed wedding venue in the Wye Valley",
    sections: [{
      heading: "Your perfect wedding venue in the Wye Valley",
      body: "The Paddocks Hotel holds a full wedding licence, so your ceremony and reception can happen in one place with no transport to arrange for your guests. Ceremonies can be held indoors or outside in the hotel gardens, and our ballroom seats up to 200 guests for the wedding breakfast and evening party.\nWe are experienced in hosting weddings of every size and budget, from intimate ceremonies to large receptions, and we tailor each package to the couple. With rooms on site for you and your guests, a garden for photographs and the Wye Valley as your backdrop, everything you need for the day is in one place just outside Ross-on-Wye.",
      image: "", imageSide: "right",
    }],
  },
  celebrations: {
    metaTitle: "Party & Function Room Hire, Ross-on-Wye | The Paddocks Hotel",
    metaDescription:
      "Function rooms for birthdays, anniversaries, christenings and private parties near Ross-on-Wye. Space for up to 300 guests, catering and ample free parking.",
    keywords:
      "function room hire Ross-on-Wye, party venue Ross-on-Wye, private party venue Herefordshire, birthday venue Wye Valley, anniversary venue Ross-on-Wye, christening venue Symonds Yat, function rooms Forest of Dean",
    heroTitle: "Celebrations", heroEyebrow: "Celebrate",
    heroSubtitle: "Party and function rooms near Ross-on-Wye",
    sections: [{
      heading: "Somewhere to celebrate",
      body: "Birthdays, anniversaries, christenings, retirement dos and wakes: our function rooms near Ross-on-Wye take everything from an intimate dinner to a party of 300. The ballroom is the natural choice for larger celebrations, with room for dancing and dining, while our smaller rooms suit more private gatherings.\nOur kitchen caters the whole event, from a hot buffet to a sit-down meal, and we can arrange decorations, audio-visual equipment and lighting. With free parking on site and bedrooms upstairs, your guests can enjoy the evening without worrying about how they are getting home.",
      image: "", imageSide: "right",
    }],
  },
  dance: {
    metaTitle: "Dance Nights & Live Music | The Paddocks Hotel, Ross-on-Wye",
    metaDescription:
      "Dance nights, live music and entertainment at The Paddocks Hotel in Symonds Yat West, near Ross-on-Wye. A proper dance floor, a bar and rooms upstairs.",
    keywords:
      "dance nights Ross-on-Wye, live music Ross-on-Wye, entertainment Symonds Yat, dance floor hire Herefordshire, music venue Wye Valley",
    heroTitle: "Dance", heroEyebrow: "Enjoy",
    heroSubtitle: "Dance nights and live music in the Wye Valley",
    sections: [{
      heading: "Music and dancing",
      body: "Our ballroom has a proper sprung dance floor, a stage and a bar, which makes it a favourite for dance clubs, social evenings and live music nights near Ross-on-Wye. The room is available for regular classes and one-off events alike.\nIf you run a dance group or are planning an event with music, get in touch and we will talk through dates, layout, catering and rooms for anyone travelling to join you.",
      image: "", imageSide: "right",
    }],
  },
  "meeting-room": {
    metaTitle: "Meeting Rooms & Conference Venue, Ross-on-Wye | The Paddocks",
    metaDescription:
      "Meeting rooms and conference space near Ross-on-Wye, 15 minutes from M50 Junction 4. Free parking and WiFi, catering, and bedrooms for overnight delegates.",
    keywords:
      "meeting rooms Ross-on-Wye, conference venue Herefordshire, business meeting room Wye Valley, training venue Ross-on-Wye, corporate events Symonds Yat, conference room Forest of Dean",
    heroTitle: "Meeting Rooms", heroEyebrow: "Business",
    heroSubtitle: "Meeting and conference space near Ross-on-Wye",
    sections: [{
      heading: "Room to work",
      body: "We offer meeting and conference rooms near Ross-on-Wye that suit everything from a board meeting for six to a training day or company conference. Rooms can be laid out boardroom, theatre or cabaret style, with audio-visual equipment and lighting available.\nWe are about fifteen minutes from M50 Junction 4, so we are an easy drive for teams coming down from the Midlands or across from Wales. Free parking, WiFi, tea and coffee, and lunch from our own kitchen all come as standard, and delegates who need to stay over can book a room upstairs.",
      image: "", imageSide: "right",
    }],
  },
  bar: {
    metaTitle: "Bar & Indian Restaurant, Symonds Yat West | The Paddocks",
    metaDescription:
      "Bar and Indian restaurant at The Paddocks Hotel, Symonds Yat West near Ross-on-Wye. Freshly cooked food, a relaxed bar and a garden for warm evenings.",
    keywords:
      "Indian restaurant Ross-on-Wye, restaurant Symonds Yat, curry house Ross-on-Wye, bar Symonds Yat West, places to eat Wye Valley, restaurant near Forest of Dean, takeaway Ross-on-Wye",
    heroTitle: "Bar & Restaurant", heroEyebrow: "Dine",
    heroSubtitle: "Indian dining in Symonds Yat West",
    sections: [{
      heading: "Eat and drink with us",
      body: "Our restaurant serves freshly prepared Indian food in Symonds Yat West, a few minutes from Ross-on-Wye, alongside a well-stocked bar and a garden that comes into its own on a warm evening. Everything is cooked to order, and we are happy to work around dietary needs if you let us know when you book.\nThe bar is open to residents and non-residents alike, so whether you are staying with us, walking the Wye Valley or driving over from Monmouth for dinner, you are very welcome. Booking is recommended at weekends.",
      image: "", imageSide: "right",
    }],
  },
  contact: {
    metaTitle: "Contact & Directions | The Paddocks Hotel, Symonds Yat West",
    metaDescription:
      "Find The Paddocks Hotel on Wye View Lane, Symonds Yat West, Ross-on-Wye HR9 6BL. Call 01600 890 246 or email reception@paddockshotel.com to book.",
    keywords:
      "Paddocks Hotel contact, hotel Symonds Yat West directions, hotel near Ross-on-Wye phone number, HR9 6BL hotel, book hotel Wye Valley",
    heroTitle: "Contact Us", heroEyebrow: "The Paddocks",
    heroSubtitle: "Symonds Yat West, Ross-on-Wye",
    sections: [{
      heading: "Get in touch",
      body: "You will find us on Wye View Lane in Symonds Yat West, midway between Ross-on-Wye and Monmouth and about fifteen minutes from M50 Junction 4. There is plenty of free parking on site.\nCall 01600 890 246 or email reception@paddockshotel.com for rooms, tables, weddings, parties and meetings. If you are enquiring about an event, let us know your date and rough numbers and we will come back to you with options.",
      image: "", imageSide: "right",
    }],
  },
  explore: {
    metaTitle: "Things to Do near Symonds Yat & Ross-on-Wye | The Paddocks",
    metaDescription:
      "Places to visit from The Paddocks Hotel: Symonds Yat Rock, canoeing on the River Wye, Goodrich Castle, Puzzlewood, Clearwell Caves and the Forest of Dean.",
    keywords:
      "things to do Symonds Yat, things to do Ross-on-Wye, attractions Wye Valley, days out Forest of Dean, Symonds Yat Rock, canoeing River Wye, places to visit Herefordshire",
    sections: [{
      heading: "Things to do nearby",
      body: "The hotel sits in the middle of one of the best corners of the country for a day out. Symonds Yat Rock, the River Wye and the Forest of Dean are all on the doorstep, with castles, caves and market towns a short drive away. Here are some of our favourites.",
      image: "", imageSide: "right",
    }],
  },
};

export const ROOMS = {
  "king-room": {
    metaTitle: "King Room, Ross-on-Wye | The Paddocks Hotel",
    metaDescription: "Spacious en-suite king room at The Paddocks Hotel in Symonds Yat West, near Ross-on-Wye. Ideal for couples exploring the Wye Valley.",
    keywords: "king room Ross-on-Wye, double room Symonds Yat, hotel room Wye Valley, en-suite room Herefordshire",
    shortDesc: "Our most spacious room, with a king-size bed and en-suite bathroom.",
    description: "Our king room is the most spacious bedroom at The Paddocks Hotel, with a king-size bed, an en-suite bathroom and plenty of room to spread out.\nIt is the natural choice for couples spending a few days in the Wye Valley, and it is a short walk from the River Wye with the Forest of Dean just across the water. Free parking is right outside, and breakfast is served downstairs.",
  },
  "double-room": {
    metaTitle: "Double Room, Symonds Yat West | The Paddocks Hotel",
    metaDescription: "Comfortable en-suite double room near Ross-on-Wye, with free parking and the River Wye and Forest of Dean on the doorstep.",
    keywords: "double room Ross-on-Wye, hotel double room Symonds Yat, bed and breakfast Wye Valley, en-suite double Herefordshire",
    shortDesc: "A warm and welcoming double room with everything you need for a restful stay.",
    description: "A warm, comfortable double room with a proper double bed, an en-suite bathroom and all the everyday things you need for a restful night.\nIt suits couples and solo travellers alike, and sits just minutes from Symonds Yat Rock and the walking trails along the River Wye. Free parking on site and an easy run into Ross-on-Wye or Monmouth.",
  },
  "family-room": {
    metaTitle: "Family Rooms near Ross-on-Wye | The Paddocks Hotel",
    metaDescription: "Family room sleeping parents and children in Symonds Yat West, near Ross-on-Wye. Close to Symonds Yat Rock, canoeing and the Forest of Dean.",
    keywords: "family rooms Ross-on-Wye, family hotel Symonds Yat, family friendly hotel Wye Valley, family accommodation Forest of Dean",
    shortDesc: "Generous space for the whole family, with flexible bedding.",
    description: "Our family room gives you generous space and flexible bedding so parents and children can all stay together, with an en-suite bathroom of your own.\nIt is a good base for a family holiday in the Wye Valley: canoe hire, the Butterfly Zoo and Symonds Yat Rock are all minutes away, with Puzzlewood, Clearwell Caves and Goodrich Castle a short drive into the Forest of Dean.",
  },
  "twin-room": {
    metaTitle: "Twin Room, Ross-on-Wye | The Paddocks Hotel",
    metaDescription: "Twin room with two single beds at The Paddocks Hotel, Symonds Yat West near Ross-on-Wye. Ideal for friends or colleagues travelling together.",
    keywords: "twin room Ross-on-Wye, twin beds hotel Symonds Yat, business accommodation Ross-on-Wye, hotel twin room Wye Valley",
    shortDesc: "Two comfortable single beds, ideal for friends or colleagues.",
    description: "Two comfortable single beds in a bright, airy room with its own en-suite bathroom.\nIt is the room friends walking the Wye Valley ask for, and it works just as well for colleagues down on business, with free parking outside and M50 Junction 4 about fifteen minutes away.",
  },
  "single-room": {
    metaTitle: "Single Room, Symonds Yat West | The Paddocks Hotel",
    metaDescription: "Comfortable en-suite single room near Ross-on-Wye, with free parking, WiFi and dinner in our restaurant downstairs.",
    keywords: "single room Ross-on-Wye, single occupancy hotel Symonds Yat, business hotel Wye Valley, solo traveller accommodation Herefordshire",
    shortDesc: "A snug, well-appointed single room for the solo traveller.",
    description: "A snug, well-appointed single room with an en-suite bathroom and everything the solo traveller needs.\nIt is popular with walkers on the Wye Valley Walk and with people down for work, with free parking outside, WiFi throughout and dinner in our restaurant downstairs.",
  },
};

async function main() {
  const prisma = new PrismaClient();
  for (const [slug, p] of Object.entries(PAGES)) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (!existing) continue;
    await prisma.page.update({
      where: { slug },
      data: {
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        keywords: p.keywords,
        ...(p.heroTitle ? { heroTitle: p.heroTitle } : {}),
        ...(p.heroEyebrow ? { heroEyebrow: p.heroEyebrow } : {}),
        ...(p.heroSubtitle ? { heroSubtitle: p.heroSubtitle } : {}),
        ...(p.sections ? { sectionsJson: JSON.stringify(p.sections) } : {}),
      },
    });
    console.log("page:", slug);
  }
  for (const [slug, r] of Object.entries(ROOMS)) {
    const existing = await prisma.room.findUnique({ where: { slug } });
    if (!existing) continue;
    await prisma.room.update({ where: { slug }, data: r });
    console.log("room:", slug);
  }
  await prisma.$disconnect();
}

if (process.argv.includes("--apply")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
