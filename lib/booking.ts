import "server-only";
import { prisma } from "./prisma";

/**
 * The booking engine: dates, availability and prices.
 *
 * Everything the guest pays is worked out here, on the server, from the
 * database. The browser only ever sends what the guest picked, so a price
 * cannot be changed by editing the page.
 *
 * Dates are "YYYY-MM-DD" strings. A stay covers the nights from checkIn up
 * to, but not including, checkOut - so 10th to 12th is two nights.
 */

export const MAX_NIGHTS = 30;
export const HOLD_MINUTES = 35; // room held while the guest pays

// ── Dates ──────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000,
  );
}

/** Each night of a stay, as the date of the evening. */
export function nightsOf(checkIn: string, checkOut: string) {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekday(date: string) {
  return new Date(date + "T00:00:00Z").getUTCDay(); // 0 = Sunday
}

/** Today in the UK, whatever timezone the server is in. */
export function todayUK() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
}) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

export function money(pence: number) {
  const pounds = pence / 100;
  return "£" + (Number.isInteger(pounds)
    ? pounds.toLocaleString("en-GB")
    : pounds.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

// ── Availability ───────────────────────────────────────────────────────

/** Bookings that are holding a room: paid, or unpaid but still in their hold. */
function holdingWhere(now = new Date()) {
  return {
    OR: [
      { status: "confirmed" },
      { status: "pending", expiresAt: { gt: now } },
    ],
  };
}

/**
 * Units of a room type that are free for every night of a stay.
 * `ignoreBookingId` lets an existing booking be re-checked against itself.
 */
export async function freeUnits(roomId: string, checkIn: string, checkOut: string, ignoreBookingId?: string) {
  const units = await prisma.roomUnit.findMany({
    where: { roomId, active: true },
    orderBy: { order: "asc" },
    include: {
      bookings: {
        where: {
          ...holdingWhere(),
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
        },
        select: { id: true },
      },
      blocks: {
        where: { start: { lt: checkOut }, end: { gt: checkIn } },
        select: { id: true },
      },
    },
  });
  return units.filter((u) => u.bookings.length === 0 && u.blocks.length === 0);
}

export type DayInfo = {
  date: string;
  free: number;      // units free that night
  total: number;     // units of this type
  price: number;     // pence for that night, after date discounts
  base: number;
  rule: string;      // name of the discount applied, if any
};

/** Night-by-night availability and price for a room type over a range. */
export async function calendarFor(roomId: string, from: string, to: string): Promise<DayInfo[]> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return [];

  const [units, rules] = await Promise.all([
    prisma.roomUnit.findMany({
      where: { roomId, active: true },
      include: {
        bookings: {
          where: { ...holdingWhere(), checkIn: { lt: to }, checkOut: { gt: from } },
          select: { checkIn: true, checkOut: true },
        },
        blocks: {
          where: { start: { lt: to }, end: { gt: from } },
          select: { start: true, end: true },
        },
      },
    }),
    activeRules(roomId),
  ]);

  const days: DayInfo[] = [];
  for (const date of nightsOf(from, to)) {
    const taken = units.filter((u) =>
      u.bookings.some((b) => b.checkIn <= date && b.checkOut > date)
      || u.blocks.some((b) => b.start <= date && b.end > date),
    ).length;
    const p = priceNight(room.basePrice, date, rules, 1);
    days.push({ date, free: units.length - taken, total: units.length, ...p });
  }
  return days;
}

// ── Prices ─────────────────────────────────────────────────────────────

type Rule = Awaited<ReturnType<typeof activeRules>>[number];

function activeRules(roomId: string) {
  return prisma.priceRule.findMany({
    where: { active: true, OR: [{ roomId: null }, { roomId }] },
  });
}

/**
 * The price of one night. A "price" rule replaces the base rate; then the
 * single best percentage or amount-off discount is taken. Discounts do not
 * stack, so the guest always sees one clear saving.
 */
function priceNight(base: number, date: string, rules: Rule[], stayNights: number) {
  const day = weekday(date);
  const applies = rules.filter((r) =>
    r.start <= date && r.end >= date
    && stayNights >= r.minNights
    && (!r.weekdays || r.weekdays.split(",").map(Number).includes(day)),
  );

  let price = base;
  let rule = "";

  const fixed = applies.filter((r) => r.kind === "price" && r.value > 0);
  if (fixed.length) {
    const best = fixed.reduce((a, b) => (b.value < a.value ? b : a));
    price = best.value;
    rule = best.name;
  }

  let bestSaving = 0;
  for (const r of applies) {
    const saving = r.kind === "percent" ? Math.round((price * Math.min(r.value, 100)) / 100)
      : r.kind === "amount" ? Math.min(r.value, price)
      : 0;
    if (saving > bestSaving) {
      bestSaving = saving;
      rule = r.name;
    }
  }
  return { price: Math.max(0, price - bestSaving), base, rule };
}

export type QuoteInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  mealPlanId?: string | null;
  promoCode?: string | null;
};

export type Quote = {
  ok: boolean;
  error?: string;
  promoError?: string;
  nights: number;
  breakdown: { date: string; price: number; base: number; rule: string }[];
  roomTotal: number;
  mealPlanName: string;
  mealTotal: number;
  promoCode: string;
  promoDiscount: number;
  total: number;
  available: number;
};

const EMPTY: Omit<Quote, "ok" | "error"> = {
  nights: 0, breakdown: [], roomTotal: 0, mealPlanName: "Room only", mealTotal: 0,
  promoCode: "", promoDiscount: 0, total: 0, available: 0,
};

/** The full price of a stay, and whether a room is free for it. */
export async function quote(input: QuoteInput): Promise<Quote> {
  const fail = (error: string): Quote => ({ ...EMPTY, ok: false, error });

  const { roomId, checkIn, checkOut } = input;
  const adults = Math.max(1, Math.floor(Number(input.adults) || 1));
  const children = Math.max(0, Math.floor(Number(input.children) || 0));

  if (!isDate(checkIn) || !isDate(checkOut)) return fail("Please choose your dates.");
  if (checkIn < todayUK()) return fail("Your arrival date is in the past.");
  if (checkOut <= checkIn) return fail("Your departure must be after your arrival.");
  const nights = daysBetween(checkIn, checkOut);
  if (nights > MAX_NIGHTS) return fail(`Online bookings are up to ${MAX_NIGHTS} nights. Please call us for longer stays.`);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || !room.bookable || room.basePrice <= 0) return fail("That room cannot be booked online.");
  if (adults + children > room.maxGuests) {
    return fail(`The ${room.name} sleeps up to ${room.maxGuests}. Please choose a larger room or call us.`);
  }

  const rules = await activeRules(roomId);
  const breakdown = nightsOf(checkIn, checkOut).map((date) => ({ date, ...priceNight(room.basePrice, date, rules, nights) }));
  const roomTotal = breakdown.reduce((s, n) => s + n.price, 0);

  let mealPlanName = "Room only";
  let mealTotal = 0;
  if (input.mealPlanId) {
    const plan = await prisma.mealPlan.findFirst({ where: { id: input.mealPlanId, active: true } });
    if (plan) {
      mealPlanName = plan.name;
      mealTotal = (plan.pricePerPerson * adults + plan.childPrice * children) * nights;
    }
  }

  // Discount code, applied to the whole stay.
  let promoCode = "";
  let promoDiscount = 0;
  let promoError: string | undefined;
  const code = (input.promoCode || "").trim().toUpperCase();
  if (code) {
    const promo = await prisma.promoCode.findUnique({ where: { code } });
    const subtotal = roomTotal + mealTotal;
    if (!promo || !promo.active) promoError = "That code is not valid.";
    else if (promo.maxUses > 0 && promo.uses >= promo.maxUses) promoError = "That code has been fully used.";
    else if (promo.validFrom && checkIn < promo.validFrom) promoError = "That code is not valid for these dates.";
    else if (promo.validTo && checkIn > promo.validTo) promoError = "That code has expired for these dates.";
    else if (nights < promo.minNights) promoError = `That code needs a stay of at least ${promo.minNights} nights.`;
    else {
      promoCode = promo.code;
      promoDiscount = promo.kind === "percent"
        ? Math.round((subtotal * Math.min(promo.value, 100)) / 100)
        : Math.min(promo.value, subtotal);
    }
  }

  const available = (await freeUnits(roomId, checkIn, checkOut)).length;
  const total = Math.max(0, roomTotal + mealTotal - promoDiscount);

  return {
    ok: available > 0,
    error: available > 0 ? undefined : "Sorry, that room is fully booked for those dates.",
    promoError,
    nights, breakdown, roomTotal, mealPlanName, mealTotal,
    promoCode, promoDiscount, total, available,
  };
}

/** A short, unambiguous booking reference, e.g. PH-7K3Q9A. */
export function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
  let ref = "";
  for (let i = 0; i < 6; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `PH-${ref}`;
}

/** Mark unpaid bookings whose hold has run out, so reports stay tidy. */
export async function expireStaleHolds() {
  await prisma.booking.updateMany({
    where: { status: "pending", expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
}
