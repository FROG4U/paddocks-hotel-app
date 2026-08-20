import Image from "next/image";
import { getSettings } from "@/lib/data";

// Brand social icons (gold gradient circles supplied by the hotel).
const SOCIALS = [
  { key: "facebook", label: "Facebook", icon: "/social/facebook.png" },
  { key: "instagram", label: "Instagram", icon: "/social/instagram.png" },
  { key: "google", label: "Google", icon: "/social/google.png" },
  { key: "tiktok", label: "TikTok", icon: "/social/tiktok.png" },
] as const;

export default async function SiteFooter() {
  const s = await getSettings();

  const hrefs: Record<string, string> = {
    facebook: s.facebookUrl,
    instagram: s.instagramUrl,
    google: s.googleUrl,
    tiktok: s.tiktokUrl,
  };
  // Only show an icon once its link has been filled in under /admin/settings.
  const shown = SOCIALS.filter((soc) => !!hrefs[soc.key]);

  return (
    <footer>
      {/* Follow us */}
      <div className="bg-navy text-white/90 py-16 text-center">
        <h3 className="nav-link text-gold text-lg mb-8">Follow Us</h3>
        <div className="flex justify-center gap-6 mb-10">
          {shown.map((soc) => (
            <a key={soc.key} href={hrefs[soc.key]} target="_blank" rel="noopener"
              aria-label={soc.label} className="block hover:brightness-110 transition">
              <Image src={soc.icon} alt={soc.label} width={104} height={104}
                className="h-13 w-13 object-contain" />
            </a>
          ))}
        </div>
        <address className="not-italic text-sm leading-relaxed text-white/70">
          {s.addressLine1}, {s.addressLine2}, {s.town} {s.postcode}<br />
          {s.phone} | <a href={`mailto:${s.email}`} className="hover:text-gold">{s.email}</a>
        </address>
      </div>

      {/* Copyright bar */}
      <div className="bg-black text-center py-5 text-xs text-white/60">
        {s.footerNote}
      </div>
    </footer>
  );
}
