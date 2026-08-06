import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getNav, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

// Dynamic default title/description/favicon for the public site (runs at
// request time — these pages are force-dynamic — so edits in /admin apply).
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    icons: { icon: s.logoUrl },
  };
}

function FloatingSocial({ facebook, instagram, email }: { facebook: string; instagram: string; email: string }) {
  const items = [
    { href: facebook || "#", label: "Facebook", d: "M13 24v-9h3l.5-4H13V8.6c0-1.1.3-1.9 2-1.9h2V3.1C16.6 3 15.5 3 14.3 3 11.6 3 9.7 4.7 9.7 7.7V11H7v4h2.7v9z" },
    { href: instagram || "#", label: "Instagram", instagram: true },
    { href: `mailto:${email}`, label: "Email", d: "M4 7h16v10H4zM4 7l8 6 8-6", stroke: true },
  ];
  return (
    <div className="hidden lg:flex flex-col fixed left-0 top-1/2 -translate-y-1/2 z-40">
      {items.map((it) => (
        <a key={it.label} href={it.href} target="_blank" rel="noopener" aria-label={it.label}
          className="w-11 h-11 grid place-items-center bg-gold text-navy hover:brightness-110 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={it.stroke ? "none" : "currentColor"}
            stroke={it.stroke ? "currentColor" : "none"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {it.instagram ? (
              <>
                <rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="17" cy="7" r="1.3" fill="currentColor" stroke="none" />
              </>
            ) : (
              <path d={it.d} />
            )}
          </svg>
        </a>
      ))}
    </div>
  );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [nav, s] = await Promise.all([getNav(), getSettings()]);
  const brandVars = `:root{--navy:${s.navyColor};--gold:${s.goldColor};--tan:${s.buttonColor};--accent:${s.accentColor};}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandVars }} />
      <SiteHeader
        nav={nav}
        logoUrl={s.logoUrl}
        siteName={s.siteName}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
      />
      <FloatingSocial facebook={s.facebookUrl} instagram={s.instagramUrl} email={s.email} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
