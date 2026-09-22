import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NAV: { heading?: string; href?: string; label?: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/chat", label: "Chat" },
  { heading: "Bookings" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/rates", label: "Rates & Discounts" },
  { href: "/admin/meal-plans", label: "Meal Plans & Offers" },
  { href: "/admin/promo-codes", label: "Discount Codes" },
  { href: "/admin/channel-sync", label: "Channel Sync" },
  { heading: "Website" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/rooms", label: "Room Pages" },
  { href: "/admin/explore", label: "Explore" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/settings", label: "Contact & Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [unread, newBookings] = await Promise.all([
    prisma.message.count({ where: { read: false, archived: false } }),
    prisma.booking.count({ where: { status: "confirmed", createdAt: { gt: new Date(Date.now() - 48 * 3600000) } } }),
  ]);
  const badges: Record<string, number> = { "/admin/messages": unread, "/admin/bookings": newBookings };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream/40">
      <aside className="md:w-60 bg-navy text-white flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-display text-lg">The Paddocks</p>
          <p className="text-xs text-white/60">Admin panel</p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((n, i) => n.heading ? (
            <p key={`h${i}`} className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-white/40">{n.heading}</p>
          ) : (
            <Link key={n.href} href={n.href!}
              className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-white/85 hover:bg-white/10">
              <span>{n.label}</span>
              {(badges[n.href!] ?? 0) > 0 && (
                <span className="bg-gold text-navy text-xs font-bold rounded-full px-2 py-0.5">{badges[n.href!]}</span>
              )}
            </Link>
          ))}
          <a href="/" target="_blank"
            className="block px-3 py-2 rounded-md text-sm text-gold hover:bg-white/10">
            View live site ↗
          </a>
        </nav>
        <form action={logoutAction} className="p-3 mt-auto">
          <button className="w-full text-left px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-5 sm:p-8 min-w-0"><div className="max-w-5xl">{children}</div></main>
    </div>
  );
}
