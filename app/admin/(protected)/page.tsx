import Link from "next/link";
import { getRooms, getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [rooms, pages, explore, s] = await Promise.all([
    getRooms(),
    prisma.page.count(),
    prisma.exploreItem.count(),
    getSettings(),
  ]);

  const cards = [
    { href: "/admin/pages", title: "Pages", desc: `${pages} pages - edit text, headings & photos`, emoji: "📄" },
    { href: "/admin/rooms", title: "Rooms & Prices", desc: `${rooms.length} rooms - details, photos & prices`, emoji: "🛏️" },
    { href: "/admin/explore", title: "Explore", desc: `${explore} cards - places to visit nearby`, emoji: "🗺️" },
    { href: "/admin/seo", title: "SEO", desc: "How Google sees the site, with an AI writer", emoji: "🔍" },
    { href: "/admin/settings", title: "Contact & Settings", desc: "Address, phone, hours, social, branding", emoji: "⚙️" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-navy mb-1">Welcome back</h1>
      <p className="text-ink/60 mb-8">Manage <strong>{s.siteName}</strong>. Changes go live instantly.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}
            className="block bg-white rounded-xl border border-black/10 p-6 hover:shadow-md hover:border-navy/30 transition">
            <div className="text-3xl mb-2">{c.emoji}</div>
            <h2 className="font-display text-xl text-navy">{c.title}</h2>
            <p className="text-sm text-ink/60 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
