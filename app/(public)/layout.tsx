import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getNav, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

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
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
