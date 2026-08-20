"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getSession, verifyLogin, createSession, destroySession } from "./auth";
import { saveUploadedImage } from "./upload";

async function requireAuth() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

function str(fd: FormData, key: string, fallback = "") {
  const v = fd.get(key);
  return typeof v === "string" ? v : fallback;
}
function bool(fd: FormData, key: string) {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

// ── Auth ──
export async function loginAction(_prev: unknown, fd: FormData) {
  const email = str(fd, "email");
  const password = str(fd, "password");
  const admin = await verifyLogin(email, password);
  if (!admin) return { error: "Incorrect email or password." };
  await createSession(admin.id, admin.email);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// ── Site settings (contact, hours, social, brand, booking, SEO) ──
export async function saveSettingsAction(fd: FormData) {
  await requireAuth();

  const logo = await saveUploadedImage(file(fd, "logoFile"), "logo");

  // Opening hours: rows hours_label_i / hours_value_i
  const hours: { label: string; value: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const label = str(fd, `hours_label_${i}`).trim();
    const value = str(fd, `hours_value_${i}`).trim();
    if (label || value) hours.push({ label, value });
  }

  await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      siteName: str(fd, "siteName"),
      tagline: str(fd, "tagline"),
      ...(logo ? { logoUrl: logo } : {}),
      navyColor: str(fd, "navyColor"),
      accentColor: str(fd, "accentColor"),
      goldColor: str(fd, "goldColor"),
      buttonColor: str(fd, "buttonColor"),
      addressLine1: str(fd, "addressLine1"),
      addressLine2: str(fd, "addressLine2"),
      town: str(fd, "town"),
      postcode: str(fd, "postcode"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      mapQuery: str(fd, "mapQuery"),
      hoursJson: JSON.stringify(hours),
      facebookUrl: str(fd, "facebookUrl"),
      instagramUrl: str(fd, "instagramUrl"),
      googleUrl: str(fd, "googleUrl"),
      tiktokUrl: str(fd, "tiktokUrl"),
      bookCtaLabel: str(fd, "bookCtaLabel"),
      bookCtaHref: str(fd, "bookCtaHref"),
      metaTitle: str(fd, "metaTitle"),
      metaDescription: str(fd, "metaDescription"),
      footerNote: str(fd, "footerNote"),
    },
  });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

// ── Pages (hero + sections + SEO) ──
export async function savePageAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) redirect("/admin/pages");

  const heroImage = await saveUploadedImage(file(fd, "heroImageFile"), page.slug + "-hero");

  const count = parseInt(str(fd, "sectionCount", "0")) || 0;
  const sections: { heading: string; body: string; image: string; imageSide: string }[] = [];
  const existing = (() => { try { return JSON.parse(page.sectionsJson); } catch { return []; } })();
  for (let i = 0; i < count; i++) {
    const heading = str(fd, `section_${i}_heading`);
    const body = str(fd, `section_${i}_body`);
    const img = await saveUploadedImage(file(fd, `section_${i}_imageFile`), `${page.slug}-section-${i}`);
    const prev = existing[i] || {};
    if (heading || body || img || prev.image) {
      sections.push({
        heading, body,
        image: img || prev.image || "",
        imageSide: prev.imageSide || "right",
      });
    }
  }

  await prisma.page.update({
    where: { id },
    data: {
      heroEyebrow: str(fd, "heroEyebrow"),
      heroTitle: str(fd, "heroTitle"),
      heroSubtitle: str(fd, "heroSubtitle"),
      ...(heroImage ? { heroImage } : {}),
      sectionsJson: JSON.stringify(sections),
      navLabel: str(fd, "navLabel"),
      showInNav: bool(fd, "showInNav"),
      metaTitle: str(fd, "metaTitle"),
      metaDescription: str(fd, "metaDescription"),
    },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/pages/${id}?saved=1`);
}

// ── Rooms (create / update) ──
export async function saveRoomAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const name = str(fd, "name").trim();
  let slug = str(fd, "slug").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const heroImage = await saveUploadedImage(file(fd, "heroImageFile"), slug);

  const data = {
    name,
    slug,
    order: parseInt(str(fd, "order", "0")) || 0,
    heroEyebrow: str(fd, "heroEyebrow", "Book Our"),
    shortDesc: str(fd, "shortDesc"),
    description: str(fd, "description"),
    price: str(fd, "price"),
    showPrice: bool(fd, "showPrice"),
    metaTitle: str(fd, "metaTitle"),
    metaDescription: str(fd, "metaDescription"),
  };

  if (id && id !== "new") {
    await prisma.room.update({
      where: { id },
      data: { ...data, ...(heroImage ? { heroImage } : {}) },
    });
  } else {
    await prisma.room.create({ data: { ...data, heroImage: heroImage || "" } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/rooms?saved=1");
}

export async function deleteRoomAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  if (id) await prisma.room.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/rooms?deleted=1");
}
