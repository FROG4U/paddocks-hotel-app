"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getSession } from "./auth";
import { daysBetween, freeUnits, isDate, newReference, quote, todayUK } from "./booking";
import { syncUnit } from "./ical";
import { capturePayment, getStripe, releasePayment, stripeConfigured } from "./stripe";
import { saveUploadedImage, UploadError } from "./upload";
import { sendBookingApproved, sendBookingDeclined, sendEmail, sendReviewRequest } from "./email";

async function requireAuth() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const int = (fd: FormData, k: string, fallback = 0) => {
  const n = parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : fallback;
};
const on = (fd: FormData, k: string) => fd.get(k) === "on";

/** "95" or "95.50" or "£95" in pounds, to pence. */
const pence = (fd: FormData, k: string) => {
  const n = parseFloat(str(fd, k).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

/** Save an uploaded photo, sending the user back with a message if it fails. */
async function tryUpload(f: File | null, baseName: string, backTo: string) {
  try {
    return await saveUploadedImage(f, baseName);
  } catch (e) {
    const msg = e instanceof UploadError ? e.message : "That image could not be saved.";
    redirect(`${backTo}?error=${encodeURIComponent(msg)}`);
  }
}

function back(path: string, params: Record<string, string>): never {
  const q = new URLSearchParams(params).toString();
  redirect(`${path}${q ? `?${q}` : ""}`);
}

// ── Rooms: price, guests and how many there are ──────────────────────

export async function saveRoomRatesAction(fd: FormData) {
  await requireAuth();
  const rooms = await prisma.room.findMany({ include: { units: { orderBy: { order: "asc" } } } });
  const today = todayUK();
  const problems: string[] = [];

  for (const room of rooms) {
    const key = (f: string) => `${f}_${room.id}`;
    if (fd.get(key("present")) === null) continue;

    await prisma.room.update({
      where: { id: room.id },
      data: {
        basePrice: pence(fd, key("price")),
        maxGuests: Math.max(1, Math.min(12, int(fd, key("guests"), room.maxGuests))),
        bookable: on(fd, key("bookable")),
      },
    });

    // Add or remove physical rooms to match the number entered.
    const wanted = Math.max(0, Math.min(50, int(fd, key("count"), room.units.length)));
    const have = room.units.length;
    if (wanted > have) {
      const base = room.name.replace(/\s+Room$/i, "");
      await prisma.roomUnit.createMany({
        data: Array.from({ length: wanted - have }, (_, i) => ({
          roomId: room.id, name: `${base} ${have + i + 1}`, order: have + i,
        })),
      });
    } else if (wanted < have) {
      // Only remove rooms that have nothing booked from today onwards.
      const removable = [];
      for (const u of [...room.units].reverse()) {
        const busy = await prisma.booking.count({
          where: { unitId: u.id, status: { in: ["confirmed", "pending"] }, checkOut: { gt: today } },
        });
        if (!busy) removable.push(u.id);
        if (removable.length === have - wanted) break;
      }
      if (removable.length) await prisma.roomUnit.deleteMany({ where: { id: { in: removable } } });
      if (removable.length < have - wanted) {
        const n = have - wanted - removable.length;
        problems.push(`${room.name}: ${n} room${n === 1 ? "" : "s"} could not be removed because ${n === 1 ? "it has" : "they have"} future bookings. Cancel or move those bookings first.`);
      }
    }
  }

  revalidatePath("/", "layout");
  back("/admin/rates", problems.length ? { error: problems.join(" ") } : { saved: "1" });
}

// ── Date discounts ────────────────────────────────────────────────────

export async function savePriceRuleAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const start = str(fd, "start");
  const end = str(fd, "end");
  const kind = ["percent", "amount", "price"].includes(str(fd, "kind")) ? str(fd, "kind") : "percent";

  if (!str(fd, "name")) back("/admin/rates", { error: "Give the discount a name, e.g. Winter midweek." });
  if (!isDate(start) || !isDate(end) || end < start) back("/admin/rates", { error: "Please choose a valid date range." });

  const value = kind === "percent" ? Math.max(0, Math.min(100, int(fd, "value"))) : pence(fd, "value");
  if (value <= 0) back("/admin/rates", { error: "Please enter the discount amount." });

  const weekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => on(fd, `day_${d}`));
  const image = await tryUpload(file(fd, "imageFile"), `offer-${str(fd, "name")}`, "/admin/rates");

  const data = {
    name: str(fd, "name"),
    roomId: str(fd, "roomId") || null,
    start, end, kind, value,
    weekdays: weekdays.length === 7 || weekdays.length === 0 ? "" : weekdays.join(","),
    minNights: Math.max(1, int(fd, "minNights", 1)),
    active: on(fd, "active"),
    showOnSite: on(fd, "showOnSite"),
    badge: str(fd, "badge"),
    description: str(fd, "description"),
    mealPlanId: str(fd, "mealPlanId"),
    ...(image ? { image } : {}),
  };
  if (id) await prisma.priceRule.update({ where: { id }, data });
  else await prisma.priceRule.create({ data });
  revalidatePath("/", "layout");
  back("/admin/rates", { saved: "1" });
}

export async function deletePriceRuleAction(fd: FormData) {
  await requireAuth();
  await prisma.priceRule.delete({ where: { id: str(fd, "id") } }).catch(() => {});
  revalidatePath("/", "layout");
  back("/admin/rates", { saved: "1" });
}

// ── Meal plans ────────────────────────────────────────────────────────

export async function saveMealPlanAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  if (!str(fd, "name")) back("/admin/meal-plans", { error: "Give the meal plan a name." });
  const data = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    breakfast: on(fd, "breakfast"),
    lunch: on(fd, "lunch"),
    dinner: on(fd, "dinner"),
    pricePerPerson: pence(fd, "pricePerPerson"),
    childPrice: pence(fd, "childPrice"),
    order: int(fd, "order"),
    active: on(fd, "active"),
  };
  if (id) await prisma.mealPlan.update({ where: { id }, data });
  else await prisma.mealPlan.create({ data });
  revalidatePath("/", "layout");
  back("/admin/meal-plans", { saved: "1" });
}

export async function deleteMealPlanAction(fd: FormData) {
  await requireAuth();
  await prisma.mealPlan.delete({ where: { id: str(fd, "id") } }).catch(() => {});
  back("/admin/meal-plans", { saved: "1" });
}

// ── Discount codes ────────────────────────────────────────────────────

export async function savePromoAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const code = str(fd, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (code.length < 3) back("/admin/promo-codes", { error: "Codes need at least 3 letters or numbers." });

  const kind = str(fd, "kind") === "amount" ? "amount" : "percent";
  const value = kind === "percent" ? Math.max(0, Math.min(100, int(fd, "value"))) : pence(fd, "value");
  if (value <= 0) back("/admin/promo-codes", { error: "Please enter the discount amount." });

  const validFrom = str(fd, "validFrom");
  const validTo = str(fd, "validTo");
  if ((validFrom && !isDate(validFrom)) || (validTo && !isDate(validTo))) {
    back("/admin/promo-codes", { error: "Please check the dates." });
  }

  const clash = await prisma.promoCode.findUnique({ where: { code } });
  if (clash && clash.id !== id) back("/admin/promo-codes", { error: `${code} already exists.` });

  const data = {
    code, kind, value, validFrom, validTo,
    minNights: Math.max(1, int(fd, "minNights", 1)),
    maxUses: Math.max(0, int(fd, "maxUses")),
    active: on(fd, "active"),
    note: str(fd, "note"),
  };
  if (id) await prisma.promoCode.update({ where: { id }, data });
  else await prisma.promoCode.create({ data });
  back("/admin/promo-codes", { saved: "1" });
}

export async function deletePromoAction(fd: FormData) {
  await requireAuth();
  await prisma.promoCode.delete({ where: { id: str(fd, "id") } }).catch(() => {});
  back("/admin/promo-codes", { saved: "1" });
}

// ── Channel sync ──────────────────────────────────────────────────────

export async function saveUnitSyncAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const url = str(fd, "icalImportUrl");
  if (url && !/^https?:\/\//i.test(url)) {
    back("/admin/channel-sync", { error: "The calendar address must start with https://" });
  }
  await prisma.roomUnit.update({
    where: { id },
    data: { name: str(fd, "name") || undefined, icalImportUrl: url, ...(url ? {} : { lastSyncError: "" }) },
  });
  if (url) await syncUnit(id);
  else await prisma.calendarBlock.deleteMany({ where: { unitId: id, source: "ical" } });
  back("/admin/channel-sync", { saved: "1" });
}

export async function syncAllNowAction() {
  await requireAuth();
  const units = await prisma.roomUnit.findMany({ where: { icalImportUrl: { not: "" } }, select: { id: true } });
  await Promise.all(units.map((u) => syncUnit(u.id)));
  back("/admin/channel-sync", { synced: String(units.length) });
}

// ── Manual blocks ─────────────────────────────────────────────────────

export async function addBlockAction(fd: FormData) {
  await requireAuth();
  const unitId = str(fd, "unitId");
  const start = str(fd, "start");
  const end = str(fd, "end");
  const from = str(fd, "from") || todayUK();
  if (!isDate(start) || !isDate(end) || end <= start) {
    back("/admin/calendar", { from, error: "Choose the first night and the day it is free again." });
  }
  await prisma.calendarBlock.create({
    data: { unitId, start, end, source: "manual", summary: str(fd, "summary") || "Blocked" },
  });
  back("/admin/calendar", { from, saved: "1" });
}

export async function deleteBlockAction(fd: FormData) {
  await requireAuth();
  await prisma.calendarBlock.deleteMany({ where: { id: str(fd, "id"), source: "manual" } });
  back("/admin/calendar", { from: str(fd, "from") || todayUK(), saved: "1" });
}

// ── Bookings ──────────────────────────────────────────────────────────

/** A booking taken by phone or at the desk. Blocks the room like any other. */
export async function createPhoneBookingAction(fd: FormData) {
  await requireAuth();
  const roomId = str(fd, "roomId");
  const checkIn = str(fd, "checkIn");
  const checkOut = str(fd, "checkOut");
  const fail = (error: string) => back("/admin/bookings/new", { error });

  if (!str(fd, "guestName")) fail("Please enter the guest's name.");
  if (!isDate(checkIn) || !isDate(checkOut) || checkOut <= checkIn) fail("Please check the dates.");

  const q = await quote({
    roomId, checkIn, checkOut,
    adults: int(fd, "adults", 2),
    children: int(fd, "children"),
    mealPlanId: str(fd, "mealPlanId") || null,
    promoCode: str(fd, "promoCode") || null,
  });
  // Staff may book further ahead or past the usual limits, but never
  // into a room that is already taken.
  const free = await freeUnits(roomId, checkIn, checkOut);
  const unitId = str(fd, "unitId");
  const unit = unitId ? free.find((u) => u.id === unitId) : free[0];
  if (!unit) fail("That room is not free for those dates.");

  const override = pence(fd, "totalOverride");
  const total = override || q.total;
  const booking = await prisma.booking.create({
    data: {
      reference: newReference(),
      roomId, unitId: unit!.id, checkIn, checkOut,
      nights: daysBetween(checkIn, checkOut),
      adults: Math.max(1, int(fd, "adults", 2)),
      children: Math.max(0, int(fd, "children")),
      mealPlanId: str(fd, "mealPlanId") || null,
      mealPlanName: q.mealPlanName,
      guestName: str(fd, "guestName"),
      guestEmail: str(fd, "guestEmail"),
      guestPhone: str(fd, "guestPhone"),
      notes: str(fd, "notes"),
      roomTotal: q.roomTotal, mealTotal: q.mealTotal,
      promoCode: q.promoCode, promoDiscount: q.promoDiscount,
      total, breakdownJson: JSON.stringify(q.breakdown),
      status: "confirmed", source: "phone",
    },
  });
  if (booking.promoCode) {
    await prisma.promoCode.updateMany({ where: { code: booking.promoCode }, data: { uses: { increment: 1 } } });
  }
  back(`/admin/bookings/${booking.id}`, { saved: "1" });
}

export async function cancelBookingAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) back("/admin/bookings", {});

  let refunded = 0;
  if (on(fd, "refund") && booking!.stripePaymentId && stripeConfigured()) {
    const amount = pence(fd, "refundAmount") || booking!.total - booking!.refundedAmount;
    try {
      const r = await getStripe().refunds.create({
        payment_intent: booking!.stripePaymentId,
        amount: Math.min(amount, booking!.total - booking!.refundedAmount),
      });
      refunded = r.amount;
    } catch (e) {
      back(`/admin/bookings/${id}`, {
        error: `Stripe refused the refund: ${e instanceof Error ? e.message : "unknown error"}. The booking has not been cancelled.`,
      });
    }
  }

  await prisma.booking.update({
    where: { id },
    data: { status: "cancelled", refundedAmount: { increment: refunded }, expiresAt: null },
  });
  revalidatePath("/", "layout");
  back(`/admin/bookings/${id}`, { cancelled: "1" });
}

// ── Which booking system the website uses ─────────────────────────────
export async function saveBookingModeAction(fd: FormData) {
  await requireAuth();
  const mode = ["innroad", "builtin", "phone"].includes(str(fd, "bookingMode"))
    ? str(fd, "bookingMode") : "phone";
  // Accept "paddocks.innroad.com" as well as a full address.
  let url = str(fd, "innRoadUrl");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;

  if (mode === "innroad" && url && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
    back("/admin/booking-system", { error: "That does not look like a web address. Paste the whole booking engine link from innRoad." });
  }

  await prisma.siteSettings.update({
    where: { id: 1 },
    data: { bookingMode: mode, innRoadUrl: url, innRoadEmbed: on(fd, "innRoadEmbed") },
  });
  revalidatePath("/", "layout");
  back("/admin/booking-system", str(fd, "test") === "1" ? { saved: "1", tested: "1" } : { saved: "1" });
}

// ── Approving bookings ────────────────────────────────────────────────

/** Confirm a booking and take the money that was held on the guest's card. */
export async function approveBookingAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) back("/admin/bookings", {});
  if (booking!.status !== "awaiting_approval") back(`/admin/bookings/${id}`, {});

  // Take the payment first: if the card fails, the booking stays pending
  // rather than being confirmed with no money behind it.
  if (booking!.stripePaymentId && booking!.total > 0 && stripeConfigured()) {
    try {
      await capturePayment(booking!.stripePaymentId);
    } catch (e) {
      back(`/admin/bookings/${id}`, {
        error: `The card could not be charged: ${e instanceof Error ? e.message : "unknown error"}. ` +
          "The booking has not been approved. The authorisation may have expired, in which case call the guest for new card details.",
      });
    }
  }

  await prisma.booking.update({
    where: { id },
    data: { status: "confirmed", approvedAt: new Date() },
  });
  sendBookingApproved(id).catch(() => {});
  revalidatePath("/", "layout");
  back(`/admin/bookings/${id}`, { approved: "1" });
}

/** Turn a booking down and release the hold on the guest's card. */
export async function declineBookingAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) back("/admin/bookings", {});

  if (booking!.stripePaymentId && stripeConfigured()) {
    // Releasing can fail if it was already taken; the guest still gets told.
    try { await releasePayment(booking!.stripePaymentId); } catch { /* already settled */ }
  }

  await prisma.booking.update({
    where: { id },
    data: { status: "declined", declinedReason: str(fd, "reason"), expiresAt: null },
  });
  sendBookingDeclined(id).catch(() => {});
  revalidatePath("/", "layout");
  back(`/admin/bookings/${id}`, { declined: "1" });
}

/** Send one guest their review request by hand. */
export async function sendReviewNowAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const ok = await sendReviewRequest(id);
  back(`/admin/bookings/${id}`, ok ? { reviewsent: "1" } : { error: "That email could not be sent. Check the email settings and that a Google review link is set." });
}

// ── Booking rules: open or closed, approval, times, terms ─────────────
export async function saveBookingRulesAction(fd: FormData) {
  await requireAuth();
  await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      bookingOpen: on(fd, "bookingOpen"),
      bookingClosedNote: str(fd, "bookingClosedNote"),
      requireApproval: on(fd, "requireApproval"),
      checkInTime: str(fd, "checkInTime") || "3pm",
      checkOutTime: str(fd, "checkOutTime") || "11am",
      termsText: str(fd, "termsText"),
      marketingOptInText: str(fd, "marketingOptInText"),
    },
  });
  revalidatePath("/", "layout");
  back("/admin/booking-rules", { saved: "1" });
}

// ── Review emails ─────────────────────────────────────────────────────
export async function saveReviewEmailAction(fd: FormData) {
  await requireAuth();
  const url = str(fd, "googleReviewUrl");
  if (url && !/^https?:\/\//i.test(url)) {
    back("/admin/review-emails", { error: "The review link must start with https://" });
  }
  await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      reviewEmailEnabled: on(fd, "reviewEmailEnabled"),
      googleReviewUrl: url,
      reviewEmailDelay: Math.max(0, Math.min(30, int(fd, "reviewEmailDelay", 1))),
      reviewEmailSubject: str(fd, "reviewEmailSubject"),
      reviewEmailBody: str(fd, "reviewEmailBody"),
      emailFromName: str(fd, "emailFromName"),
      emailFromAddr: str(fd, "emailFromAddr"),
    },
  });
  back("/admin/review-emails", { saved: "1" });
}

/** Send one test email to the hotel's own address. */
export async function sendTestEmailAction() {
  await requireAuth();
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const ok = await sendEmail({
    to: s?.email || "",
    subject: "Test email from your website",
    heading: "Email is working",
    body: [
      "This is a test from the website's admin panel.",
      "If you can read this, booking confirmations and review requests will reach your guests.",
    ],
  });
  back("/admin/review-emails", ok ? { tested: "1" } : { error: "The test email could not be sent. Check the mailbox settings in Plesk." });
}

// ── Room pictures ─────────────────────────────────────────────────────
export async function addRoomImageAction(fd: FormData) {
  await requireAuth();
  const roomId = str(fd, "roomId");
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) back("/admin/rooms", {});

  const url = await tryUpload(file(fd, "imageFile"), `${room!.slug}-photo`, `/admin/rooms/${roomId}`);
  if (!url) back(`/admin/rooms/${roomId}`, { error: "Please choose a photo to add." });

  const count = await prisma.roomImage.count({ where: { roomId } });
  await prisma.roomImage.create({
    data: { roomId, url: url!, caption: str(fd, "caption"), order: count },
  });
  revalidatePath("/", "layout");
  back(`/admin/rooms/${roomId}`, { saved: "1" });
}

export async function deleteRoomImageAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const img = await prisma.roomImage.findUnique({ where: { id } });
  await prisma.roomImage.delete({ where: { id } }).catch(() => {});
  revalidatePath("/", "layout");
  back(`/admin/rooms/${img?.roomId ?? ""}`, { saved: "1" });
}

// ── Publishing the latest version of the site ─────────────────────────
export async function startDeployAction() {
  await requireAuth();
  const { startDeploy } = await import("./deploy");
  const result = await startDeploy("the admin panel");
  back("/admin/update", result.started ? { started: "1" } : { error: result.reason ?? "Could not start the update." });
}
