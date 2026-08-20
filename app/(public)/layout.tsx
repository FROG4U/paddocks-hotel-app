import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatWidget from "@/components/ChatWidget";
import { getNav, getSettings } from "@/lib/data";
import { hotelJsonLd, JsonLd, keywordList, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Dynamic default title/description/favicon for the public site (runs at
// request time - these pages are force-dynamic - so edits in /admin apply).
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl(s)),
    title: { default: s.metaTitle, template: `%s | ${s.siteName}` },
    description: s.metaDescription,
    keywords: keywordList(s.metaKeywords),
    icons: { icon: s.logoUrl },
    applicationName: s.siteName,
    formatDetection: { telephone: true, address: true, email: true },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [nav, s] = await Promise.all([getNav(), getSettings()]);
  const brandVars = `:root{--navy:${s.navyColor};--gold:${s.goldColor};--tan:${s.buttonColor};--accent:${s.accentColor};}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandVars }} />
      {/* Hotel details for Google: address, phone, hours, social links */}
      <JsonLd data={hotelJsonLd(s)} />
      <SiteHeader
        nav={nav}
        logoUrl={s.logoUrl}
        siteName={s.siteName}
        ctaLabel={s.bookCtaLabel}
        ctaHref={s.bookCtaHref}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {s.chatEnabled && (
        <ChatWidget name={s.chatName} greeting={s.chatGreeting} phone={s.phone} email={s.email} />
      )}
    </>
  );
}
