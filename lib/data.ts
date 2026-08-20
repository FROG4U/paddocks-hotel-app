import { prisma } from "./prisma";

export type NavItem = { label: string; href: string; children?: NavItem[] };

export async function getSettings() {
  let s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.siteSettings.create({ data: { id: 1 } });
  return s;
}

export async function getRooms() {
  return prisma.room.findMany({ orderBy: { order: "asc" } });
}

export async function getRoom(slug: string) {
  return prisma.room.findUnique({ where: { slug } });
}

export async function getExploreItems() {
  return prisma.exploreItem.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
  });
}

export async function getAllExploreItems() {
  return prisma.exploreItem.findMany({ orderBy: { order: "asc" } });
}

export async function getPage(slug: string) {
  return prisma.page.findUnique({ where: { slug } });
}

export async function getPagesByGroup(group: string) {
  return prisma.page.findMany({
    where: { navGroup: group, showInNav: true },
    orderBy: { order: "asc" },
  });
}

// Build the top navigation:
// Home · Our Rooms(▾) · What We Offer(▾) · Explore · Food & Bar(▾) · Contact Us
export async function getNav(): Promise<NavItem[]> {
  const [rooms, offer, food, home, contact, exploreItems] = await Promise.all([
    getRooms(),
    getPagesByGroup("explore"),
    getPagesByGroup("food"),
    getPage("home"),
    getPage("contact"),
    getExploreItems(),
  ]);

  const nav: NavItem[] = [];
  if (home?.showInNav) nav.push({ label: home.navLabel || "HOME", href: "/" });
  if (rooms.length)
    nav.push({
      label: "OUR ROOMS",
      href: "#",
      children: rooms.map((r) => ({ label: r.name, href: `/rooms/${r.slug}` })),
    });
  if (offer.length)
    nav.push({
      label: "WHAT WE OFFER",
      href: "#",
      children: offer.map((p) => ({ label: p.navLabel || p.title, href: `/${p.slug}` })),
    });
  if (exploreItems.length) nav.push({ label: "EXPLORE", href: "/explore" });
  if (food.length)
    nav.push({
      label: "FOOD & BAR",
      href: "#",
      children: food.map((p) => ({ label: p.navLabel || p.title, href: `/${p.slug}` })),
    });
  if (contact?.showInNav)
    nav.push({ label: contact.navLabel || "CONTACT US", href: "/contact" });

  return nav;
}

export type Section = { heading?: string; body?: string; image?: string; imageSide?: string };

export function parseSections(json: string): Section[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export type HourRow = { label: string; value: string };
export function parseHours(json: string): HourRow[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
