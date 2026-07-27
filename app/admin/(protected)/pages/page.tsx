import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PagesList() {
  const pages = await prisma.page.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-6">Pages</h1>
      <p className="text-ink/60 mb-6 text-sm">Edit the wording, headings and photos on each page.</p>
      <ul className="space-y-2">
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/pages/${p.id}`}
              className="flex items-center justify-between bg-white rounded-lg border border-black/10 px-4 py-3 hover:border-navy/30 hover:shadow-sm transition">
              <span className="font-medium text-navy">{p.title}</span>
              <span className="text-xs text-ink/50">/{p.slug === "home" ? "" : p.slug} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
