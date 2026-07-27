import { getSettings, parseHours } from "@/lib/data";

export default async function SiteFooter() {
  const s = await getSettings();
  const hours = parseHours(s.hoursJson);
  return (
    <footer className="bg-navy text-white/90 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-display text-gold text-xl mb-3">{s.siteName}</h3>
          <p className="text-sm text-white/70">{s.tagline}</p>
        </div>
        <div>
          <h4 className="nav-link text-gold mb-3">Find Us</h4>
          <p className="text-sm leading-relaxed">
            {s.addressLine1}<br />{s.addressLine2}<br />{s.town} {s.postcode}
          </p>
        </div>
        <div>
          <h4 className="nav-link text-gold mb-3">Get In Touch</h4>
          <p className="text-sm leading-relaxed">
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-white">{s.phone}</a><br />
            <a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a>
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            {s.facebookUrl && <a href={s.facebookUrl} className="hover:text-white" target="_blank" rel="noopener">Facebook</a>}
            {s.instagramUrl && <a href={s.instagramUrl} className="hover:text-white" target="_blank" rel="noopener">Instagram</a>}
          </div>
        </div>
        <div>
          <h4 className="nav-link text-gold mb-3">Opening Hours</h4>
          <ul className="text-sm space-y-1">
            {hours.map((h, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-white/70">{h.label}</span>
                <span>{h.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">
        {s.footerNote}
      </div>
    </footer>
  );
}
