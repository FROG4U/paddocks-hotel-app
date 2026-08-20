import Image from "next/image";

export function Text({ label, name, defaultValue, placeholder, required, hint }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-navy mb-1">{label}</span>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} required={required}
        className="w-full border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy" />
      {hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 4, hint }: {
  label: string; name: string; defaultValue?: string; rows?: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-navy mb-1">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={rows}
        className="w-full border border-black/15 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy" />
      {hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-navy">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 accent-[var(--navy)]" />
      {label}
    </label>
  );
}

export function ImageField({ label, name, current, hint }: {
  label: string; name: string; current?: string; hint?: string;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-navy mb-1">{label}</span>
      {current ? (
        <div className="relative w-40 h-28 rounded-md overflow-hidden border border-black/10 mb-2 bg-cream">
          <Image src={current} alt="" fill className="object-cover" sizes="160px" />
        </div>
      ) : (
        <div className="w-40 h-28 rounded-md border border-dashed border-black/20 mb-2 grid place-items-center text-xs text-ink/40">
          No image yet
        </div>
      )}
      <input type="file" name={name} accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.tif,.tiff"
        className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-navy file:text-white file:px-3 file:py-1.5 file:text-sm" />
      <span className="block text-xs text-ink/50 mt-1">
        {hint || "Leave empty to keep the current image. Photos are resized and compressed automatically. JPEG, PNG, WebP, AVIF, GIF and TIFF work; iPhone HEIC files do not."}
      </span>
    </div>
  );
}

export function SavedBanner({ show, text = "Saved - changes are live." }: { show?: boolean; text?: string }) {
  if (!show) return null;
  return <div className="mb-5 rounded-md bg-green-600 text-white text-sm px-4 py-2.5">✓ {text}</div>;
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-5 rounded-md bg-red-600 text-white text-sm px-4 py-3 leading-relaxed">{message}</div>;
}

export function SaveBar({ label = "Save changes" }: { label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-5 sm:-mx-8 mt-8 px-5 sm:px-8 py-4 bg-white/90 backdrop-blur border-t border-black/10">
      <button type="submit" className="bg-navy text-white font-semibold rounded-md px-6 py-2.5 hover:bg-navy/90">
        {label}
      </button>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-black/10 p-5 sm:p-6 mb-6">
      {title && <h2 className="font-display text-lg text-navy mb-4">{title}</h2>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
