// The hotel's real rooms, from the room list reception gave us on 11 Nov 2026.
//
// Deliberately gentle: it sets the things that come off that list (name, the
// nightly price, bed, how many people, and the rooms themselves) and leaves
// every photo, description and page title exactly as the hotel has them.

export const name = "001-room-inventory";

const ROOMS = [
  {
    slug: "double-room", rename: "Standard Double Room",
    price: 10400, bed: "1 double bed", guests: 2, order: 0,
    rooms: [3, 8, 29, 30, 31, 32, 33],
  },
  {
    slug: "garden-view-double-room", create: "Garden View Double Room",
    price: 10900, bed: "1 double bed", guests: 2, order: 1,
    rooms: [2, 10, 21],
    copyPhotoFrom: "double-room",
    shortDesc: "A comfortable double room looking out over the garden.",
    description:
      "The same comfortable double bed and en-suite bathroom as our standard double, with a window looking out over the garden.\n" +
      "It suits couples and solo travellers alike, and sits just minutes from Symonds Yat Rock and the walking trails along the River Wye. Free parking on site and an easy run into Ross-on-Wye or Monmouth.",
    metaTitle: "Garden View Double Room, Symonds Yat West | The Paddocks Hotel",
    metaDescription:
      "An en-suite double room looking out over our garden, with free parking outside. Minutes from Symonds Yat Rock and the River Wye, near Ross-on-Wye.",
    keywords:
      "garden view room Ross-on-Wye, double room Symonds Yat, hotel room Wye Valley, en-suite double Herefordshire",
  },
  {
    slug: "king-room", rename: "Standard King Room",
    price: 11300, bed: "1 king bed", guests: 2, order: 2,
    rooms: [5, 9, 34, 35],
  },
  {
    slug: "garden-view-king-room", create: "Garden View King Room",
    price: 12400, bed: "1 king bed", guests: 2, order: 3,
    rooms: [1, 24, 25, 27, 28],
    copyPhotoFrom: "king-room",
    shortDesc: "A king-size bed and a window over the garden.",
    description:
      "A king-size bed, an en-suite bathroom and plenty of room to spread out, with a window looking out over the garden.\n" +
      "It is the natural choice for couples spending a few days in the Wye Valley, and it is a short walk from the River Wye with the Forest of Dean just across the water. Free parking is right outside, and breakfast is served downstairs.",
    metaTitle: "Garden View King Room, Symonds Yat West | The Paddocks Hotel",
    metaDescription:
      "A king-size en-suite room looking out over our garden, with free parking outside. A short walk from the River Wye, near Ross-on-Wye.",
    keywords:
      "garden view king room Ross-on-Wye, king room Symonds Yat, hotel room Wye Valley, en-suite king Herefordshire",
  },
  { slug: "twin-room", price: 12400, bed: "2 single beds", guests: 2, order: 4, rooms: [11, 22, 23, 26] },
  { slug: "family-room", price: 13500, bed: "1 king bed", guests: 4, order: 5, rooms: [12] },
  { slug: "single-room", price: 8100, bed: "1 single bed", guests: 1, order: 6, rooms: [6, 7] },
];

export async function apply(prisma, log) {
  // Renaming the rooms would pull the rug from under anything already booked,
  // so if there are bookings we leave the rooms alone and say so.
  const booked = await prisma.booking.count();

  for (const r of ROOMS) {
    const common = {
      basePrice: r.price,
      bedType: r.bed,
      maxGuests: r.guests,
      order: r.order,
      bookable: true,
      price: `From £${(r.price / 100).toFixed(0)} per night`,
    };

    let room = await prisma.room.findUnique({ where: { slug: r.slug } });

    if (!room) {
      if (!r.create) { log(`  ! ${r.slug} is not on this site, skipped`); continue; }
      const from = r.copyPhotoFrom
        ? await prisma.room.findUnique({ where: { slug: r.copyPhotoFrom } })
        : null;
      room = await prisma.room.create({
        data: {
          ...common,
          slug: r.slug,
          name: r.create,
          shortDesc: r.shortDesc,
          description: r.description,
          metaTitle: r.metaTitle,
          metaDescription: r.metaDescription,
          keywords: r.keywords,
          heroImage: from?.heroImage || "",
          showPrice: true,
        },
      });
      log(`  + ${r.create}, £${(r.price / 100).toFixed(0)}, ${r.rooms.length} room(s)`);
    } else {
      // Only the facts from the room list. Photos and wording stay as they are.
      await prisma.room.update({
        where: { id: room.id },
        data: { ...common, ...(r.rename ? { name: r.rename } : {}) },
      });
      log(`  = ${r.rename || room.name}, £${(r.price / 100).toFixed(0)}, ${r.rooms.length} room(s)`);
    }

    if (booked > 0) continue;

    // The rooms themselves, named with the hotel's own numbers so they are
    // recognisable on the calendar.
    // The rooms themselves, named with the hotel's own numbers so they are
    // recognisable on the calendar. Existing rooms are renamed rather than
    // replaced, so any dates the hotel has blocked off stay blocked.
    const wanted = r.rooms.map((n) => `Room ${n}`);
    const have = await prisma.roomUnit.findMany({
      where: { roomId: room.id }, orderBy: { order: "asc" },
    });

    for (const [i, nm] of wanted.entries()) {
      if (have[i]) {
        await prisma.roomUnit.update({
          where: { id: have[i].id }, data: { name: nm, order: i, active: true },
        });
      } else {
        await prisma.roomUnit.create({ data: { roomId: room.id, name: nm, order: i } });
      }
    }

    // Anything left over. If dates have been blocked off on it we keep it and
    // just switch it off, rather than quietly throwing that work away.
    for (const spare of have.slice(wanted.length)) {
      const blocks = await prisma.calendarBlock.count({ where: { unitId: spare.id } });
      if (blocks > 0) {
        await prisma.roomUnit.update({ where: { id: spare.id }, data: { active: false } });
        log(`  ! ${spare.name} has dates blocked off, so it was switched off rather than removed`);
      } else {
        await prisma.roomUnit.delete({ where: { id: spare.id } });
      }
    }
  }

  if (booked > 0) {
    log("  ! There are bookings already, so the room numbers were left alone.");
  }
}
