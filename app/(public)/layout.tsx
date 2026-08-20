import type { Metadata } from "next";
import Image from "next/image";
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

function FloatingSocial({ facebook, instagram, google, tiktok, email }:
  { facebook: string; instagram: string; google: string; tiktok: string; email: string }) {
  // Brand gold-circle icons; each only appears once its link is set in /admin/settings.
  const items = [
    { href: facebook, label: "Facebook", icon: "/social/facebook.png" },
    { href: instagram, label: "Instagram", icon: "/social/instagram.png" },
    { href: google, label: "Google", icon: "/social/google.png" },
    { href: tiktok, label: "TikTok", icon: "/social/tiktok.png" },
  ].filter((it) => !!it.href);

  return (
    <div className="hidden lg:flex flex-col gap-2 fixed left-3 top-1/2 -translate-y-1/2 z-40">
      {items.map((it) => (
        <a key={it.label} href={it.href} target="_blank" rel="noopener" aria-label={it.label}
          className="block hover:brightness-110 hover:scale-105 transition">
          <Image src={it.icon} alt={it.label} width={88} height={88} className="h-11 w-11 object-contain drop-shadow" />
        </a>
      ))}
      <a href={`mailto:${email}`} aria-label="Email us"
        className="w-11 h-11 grid place-items-center rounded-full bg-gold text-navy hover:brightness-110 hover:scale-105 transition drop-shadow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16v10H4zM4 7l8 6 8-6" />
        </svg>
      </a>
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
      <FloatingSocial facebook={s.facebookUrl} instagram={s.instagramUrl} google={s.googleUrl} tiktok={s.tiktokUrl} email={s.email} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
