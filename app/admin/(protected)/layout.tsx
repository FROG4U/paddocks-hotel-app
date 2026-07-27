import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/rooms", label: "Rooms & Prices" },
  { href: "/admin/settings", label: "Contact & Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream/40">
      <aside className="md:w-60 bg-navy text-white flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-display text-lg">The Paddocks</p>
          <p className="text-xs text-white/60">Admin panel</p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="block px-3 py-2 rounded-md text-sm text-white/85 hover:bg-white/10">
              {n.label}
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
      <main className="flex-1 p-5 sm:p-8 max-w-4xl">{children}</main>
    </div>
  );
}
