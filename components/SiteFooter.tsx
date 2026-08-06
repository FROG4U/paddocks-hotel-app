import { getSettings } from "@/lib/data";

// Gold circular social icons (white glyph on a gold gradient circle) to match the brand.
function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={label} className="block hover:brightness-110 transition">
      <svg width="52" height="52" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b8892f" />
            <stop offset="0.5" stopColor="#e6cd82" />
            <stop offset="1" stopColor="#c9a24b" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="24" fill={`url(#g-${label})`} />
        <g transform="translate(12 12)" fill="#fff">{children}</g>
      </svg>
    </a>
  );
}

export default async function SiteFooter() {
  const s = await getSettings();

  return (
    <footer>
      {/* Follow us */}
      <div className="bg-navy text-white/90 py-16 text-center">
        <h3 className="nav-link text-gold text-lg mb-8">Follow Us</h3>
        <div className="flex justify-center gap-6 mb-10">
          <Social href={s.facebookUrl || "#"} label="Facebook">
            <path d="M13 24v-9h3l.5-4H13V8.6c0-1.1.3-1.9 2-1.9h2V3.1C16.6 3 15.5 3 14.3 3 11.6 3 9.7 4.7 9.7 7.7V11H7v4h2.7v9z" />
          </Social>
          <Social href={s.instagramUrl || "#"} label="Instagram">
            <path fill="none" stroke="#fff" strokeWidth="2.2" d="M8 5h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" />
            <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="2.2" />
            <circle cx="16.4" cy="7.6" r="1.3" />
          </Social>
          <Social href="#" label="Google">
            <path d="M12 10.9v2.7h3.9c-.2 1.2-1.4 3.4-3.9 3.4-2.4 0-4.3-2-4.3-4.4S9.6 8.2 12 8.2c1.3 0 2.2.6 2.8 1.1l2-1.9C17.5 6.3 15 5 12 5 7.6 5 4 8.6 4 13s3.6 8 8 8c4.6 0 7.6-3.2 7.6-7.8 0-.5 0-.9-.1-1.3z" />
          </Social>
          <Social href="#" label="TikTok">
            <path d="M15 4c.3 2 1.6 3.6 3.6 3.9v2.6c-1.3 0-2.5-.4-3.6-1.1v5.9A5.15 5.15 0 1 1 9.7 10v2.7a2.5 2.5 0 1 0 1.8 2.4V4z" />
          </Social>
        </div>
        <address className="not-italic text-sm leading-relaxed text-white/70">
          {s.addressLine1}, {s.addressLine2}, {s.town} {s.postcode}<br />
          {s.phone} | {s.email}
        </address>
      </div>

      {/* Copyright bar */}
      <div className="bg-black text-center py-5 text-xs text-white/60">
        {s.footerNote}
      </div>
    </footer>
  );
}
