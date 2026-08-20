"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getSession, verifyLogin, createSession, destroySession } from "./auth";
import { saveUploadedImage, UploadError } from "./upload";
import { parseSections } from "./data";
import { suggestSeo } from "./ai";
import { suggestSeoFree } from "./seo-suggest";

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
/** Run an upload, sending the user back with a readable message if it fails. */
async function tryUpload(f: File | null, baseName: string, backTo: string) {
  try {
    return await saveUploadedImage(f, baseName);
  } catch (e) {
    const msg = e instanceof UploadError ? e.message : "That image could not be saved. Please try a different file.";
    redirect(`${backTo}${backTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
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

  const logo = await tryUpload(file(fd, "logoFile"), "logo", "/admin/settings");
  const ogImage = await tryUpload(file(fd, "ogImageFile"), "share-image", "/admin/settings");

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
      chatEnabled: bool(fd, "chatEnabled"),
      chatName: str(fd, "chatName") || "Paddocks Assistant",
      chatGreeting: str(fd, "chatGreeting"),
      bookCtaLabel: str(fd, "bookCtaLabel"),
      bookCtaHref: str(fd, "bookCtaHref"),
      siteUrl: str(fd, "siteUrl").trim().replace(/\/$/, ""),
      metaTitle: str(fd, "metaTitle"),
      metaDescription: str(fd, "metaDescription"),
      metaKeywords: str(fd, "metaKeywords"),
      ...(ogImage ? { ogImage } : {}),
      geoLat: str(fd, "geoLat"),
      geoLng: str(fd, "geoLng"),
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

  const heroImage = await tryUpload(file(fd, "heroImageFile"), page.slug + "-hero", `/admin/pages/${id}`);

  const count = parseInt(str(fd, "sectionCount", "0")) || 0;
  const sections: { heading: string; body: string; image: string; imageSide: string }[] = [];
  const existing = (() => { try { return JSON.parse(page.sectionsJson); } catch { return []; } })();
  for (let i = 0; i < count; i++) {
    const heading = str(fd, `section_${i}_heading`);
    const body = str(fd, `section_${i}_body`);
    const img = await tryUpload(file(fd, `section_${i}_imageFile`), `${page.slug}-section-${i}`, `/admin/pages/${id}`);
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
      keywords: str(fd, "keywords"),
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

  const heroImage = await tryUpload(file(fd, "heroImageFile"), slug, `/admin/rooms/${id || "new"}`);

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
    keywords: str(fd, "keywords"),
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

// ── Explore cards (create / update / delete) ──
export async function saveExploreAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const title = str(fd, "title").trim();
  const slugify = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let slug = slugify(str(fd, "slug").trim()) || slugify(title);
  if (!slug) slug = `card-${Date.now()}`;

  // Keep slugs unique so two cards can share a title without clashing.
  const clash = await prisma.exploreItem.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-2`;

  const image = await tryUpload(file(fd, "imageFile"), `explore-${slug}`, `/admin/explore/${id || "new"}`);

  let linkUrl = str(fd, "linkUrl").trim();
  // Accept "mazes.co.uk" as well as a full address.
  if (linkUrl && !/^https?:\/\//i.test(linkUrl) && !linkUrl.startsWith("/")) {
    linkUrl = `https://${linkUrl}`;
  }

  const data = {
    slug,
    title,
    description: str(fd, "description"),
    linkUrl,
    buttonLabel: str(fd, "buttonLabel", "View") || "View",
    order: parseInt(str(fd, "order", "0")) || 0,
    published: bool(fd, "published"),
  };

  if (id && id !== "new") {
    await prisma.exploreItem.update({
      where: { id },
      data: { ...data, ...(image ? { image } : {}) },
    });
  } else {
    await prisma.exploreItem.create({ data: { ...data, image: image || "" } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/explore?saved=1");
}

export async function deleteExploreAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  if (id) await prisma.exploreItem.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/explore?deleted=1");
}

// ── AI SEO assistant ──
export async function generateSeoAction(fd: FormData) {
  await requireAuth();
  const targetType = str(fd, "targetType");
  const targetId = str(fd, "targetId");
  const useAi = str(fd, "mode") === "ai";
  if (targetType !== "page" && targetType !== "room") redirect("/admin/seo");

  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!s) redirect("/admin/seo");

  let name = "", url = "", title = "", desc = "", keywords = "", body = "", slug = "";
  if (targetType === "page") {
    const page = await prisma.page.findUnique({ where: { id: targetId } });
    if (!page) redirect("/admin/seo");
    name = page.title;
    slug = page.slug;
    url = page.slug === "home" ? "/" : `/${page.slug}`;
    title = page.metaTitle; desc = page.metaDescription; keywords = page.keywords;
    body = [page.heroTitle, page.heroSubtitle,
      ...parseSections(page.sectionsJson).map((x) => `${x.heading ?? ""}\n${x.body ?? ""}`)]
      .filter(Boolean).join("\n\n");
  } else {
    const room = await prisma.room.findUnique({ where: { id: targetId } });
    if (!room) redirect("/admin/seo");
    name = room.name;
    slug = room.slug;
    url = `/rooms/${room.slug}`;
    title = room.metaTitle; desc = room.metaDescription; keywords = room.keywords;
    body = [room.shortDesc, room.description].filter(Boolean).join("\n\n");
  }

  try {
    const out = useAi
      ? await suggestSeo({
          hotel: {
            name: s.siteName, addressLine1: s.addressLine1, addressLine2: s.addressLine2,
            town: s.town, postcode: s.postcode, phone: s.phone, email: s.email,
            keywords: s.metaKeywords,
          },
          pageKind: targetType,
          pageName: name,
          url,
          currentTitle: title,
          currentDescription: desc,
          currentKeywords: keywords,
          currentBody: body,
        })
      : { ...suggestSeoFree({
          hotel: {
            siteName: s.siteName, town: s.town, locality: s.addressLine2,
            county: "Herefordshire", phone: s.phone,
          },
          kind: targetType,
          slug,
          name,
          body,
        }), bodyText: "" };
    const source = useAi ? "ai" : "free";

    await prisma.seoDraft.upsert({
      where: { targetType_targetId: { targetType, targetId } },
      update: { ...out, targetName: name, source },
      create: { targetType, targetId, targetName: name, source, ...out },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    redirect(`/admin/seo?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/seo?generated=${encodeURIComponent(name)}#draft-${targetId}`);
}

export async function applySeoDraftAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const withBody = bool(fd, "applyBody");
  const draft = await prisma.seoDraft.findUnique({ where: { id } });
  if (!draft) redirect("/admin/seo");

  const seo = {
    metaTitle: str(fd, "metaTitle") || draft.metaTitle,
    metaDescription: str(fd, "metaDescription") || draft.metaDescription,
    keywords: str(fd, "keywords") || draft.keywords,
  };
  const body = str(fd, "bodyText") || draft.bodyText;

  if (draft.targetType === "page") {
    const page = await prisma.page.findUnique({ where: { id: draft.targetId } });
    if (page) {
      let sectionsJson = page.sectionsJson;
      if (withBody && body) {
        const sections = parseSections(page.sectionsJson);
        if (sections.length) sections[0] = { ...sections[0], body };
        else sections.push({ heading: "", body, image: "", imageSide: "right" });
        sectionsJson = JSON.stringify(sections);
      }
      await prisma.page.update({ where: { id: page.id }, data: { ...seo, sectionsJson } });
    }
  } else {
    const room = await prisma.room.findUnique({ where: { id: draft.targetId } });
    if (room) {
      await prisma.room.update({
        where: { id: room.id },
        data: { ...seo, ...(withBody && body ? { description: body } : {}) },
      });
    }
  }

  await prisma.seoDraft.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/seo?applied=1");
}

export async function discardSeoDraftAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  if (id) await prisma.seoDraft.delete({ where: { id } }).catch(() => {});
  redirect("/admin/seo");
}

// ── Contact form ──
export async function sendMessageAction(
  _prev: { ok: boolean; error: string },
  fd: FormData,
): Promise<{ ok: boolean; error: string }> {
  // Honeypot: bots fill every field they find.
  if (str(fd, "website").trim()) return { ok: true, error: "" };

  const name = str(fd, "name").trim();
  const email = str(fd, "email").trim();
  const body = str(fd, "body").trim();
  if (!name || !email || !body) {
    return { ok: false, error: "Please fill in your name, email and message." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." };
  }
  if (body.length > 5000) {
    return { ok: false, error: "That message is too long. Please keep it under 5000 characters." };
  }

  await prisma.message.create({
    data: {
      name, email,
      phone: str(fd, "phone").trim(),
      subject: str(fd, "subject").trim() || "Enquiry",
      body,
      source: "contact",
    },
  });
  return { ok: true, error: "" };
}

// ── Messages inbox ──
export async function markMessageAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  const action = str(fd, "do");
  if (!id) redirect("/admin/messages");

  if (action === "delete") await prisma.message.delete({ where: { id } }).catch(() => {});
  else if (action === "archive") await prisma.message.update({ where: { id }, data: { archived: true, read: true } });
  else if (action === "restore") await prisma.message.update({ where: { id }, data: { archived: false } });
  else if (action === "unread") await prisma.message.update({ where: { id }, data: { read: false } });
  else await prisma.message.update({ where: { id }, data: { read: true } });

  redirect(str(fd, "back") || "/admin/messages");
}

export async function deleteConversationAction(fd: FormData) {
  await requireAuth();
  const id = str(fd, "id");
  if (id) await prisma.chatConversation.delete({ where: { id } }).catch(() => {});
  redirect("/admin/chat");
}

// ── Reconnect photos whose database link was lost ──
// Uploaded filenames start with the slug of whatever they belong to, so an
// orphaned file can be matched back to its record.
export async function relinkPhotosAction() {
  await requireAuth();
  const { uploadDirs } = await import("./storage");
  const fs = await import("fs");
  const path = await import("path");

  // Every image on disk, newest first, from both upload folders.
  const files: { name: string; time: number }[] = [];
  for (const dir of uploadDirs()) {
    try {
      for (const name of fs.readdirSync(dir)) {
        if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(name)) continue;
        if (files.some((f) => f.name === name)) continue;
        files.push({ name, time: fs.statSync(path.join(dir, name)).mtimeMs });
      }
    } catch { /* folder may not exist */ }
  }
  files.sort((a, b) => b.time - a.time);

  const newestFor = (prefix: string) =>
    files.find((f) => f.name.toLowerCase().startsWith(prefix.toLowerCase() + "-"))?.name;

  let fixed = 0;

  for (const item of await prisma.exploreItem.findMany({ where: { image: "" } })) {
    const found = newestFor(`explore-${item.slug}`);
    if (found) {
      await prisma.exploreItem.update({ where: { id: item.id }, data: { image: `/uploads/${found}` } });
      fixed++;
    }
  }

  for (const room of await prisma.room.findMany({ where: { heroImage: "" } })) {
    const found = newestFor(room.slug);
    if (found) {
      await prisma.room.update({ where: { id: room.id }, data: { heroImage: `/uploads/${found}` } });
      fixed++;
    }
  }

  for (const page of await prisma.page.findMany({ where: { heroImage: "" } })) {
    const found = newestFor(`${page.slug}-hero`);
    if (found) {
      await prisma.page.update({ where: { id: page.id }, data: { heroImage: `/uploads/${found}` } });
      fixed++;
    }
  }

  revalidatePath("/", "layout");
  redirect(`/admin/explore?relinked=${fixed}`);
}
