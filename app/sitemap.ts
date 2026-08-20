import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [s, pages, rooms, explore] = await Promise.all([
    getSettings(),
    prisma.page.findMany(),
    prisma.room.findMany({ orderBy: { order: "asc" } }),
    prisma.exploreItem.count({ where: { published: true } }),
  ]);
  const base = siteUrl(s);

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: s.updatedAt, changeFrequency: "weekly", priority: 1 },
  ];

  for (const p of pages) {
    if (p.slug === "home") continue;
    if (p.slug === "explore" && explore === 0) continue;
    entries.push({
      url: `${base}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: p.slug === "weddings" || p.slug === "contact" ? 0.9 : 0.7,
    });
  }

  for (const r of rooms) {
    entries.push({
      url: `${base}/rooms/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
