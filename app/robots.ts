import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  const base = siteUrl(s);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
