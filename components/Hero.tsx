import Link from "next/link";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  size?: "full" | "tall";
};

/**
 * Hero / image banner - matches the original design at paddock.frog4u.com:
 * full-height hero (100vh) or a fixed 700px banner, a flat black 50% overlay,
 * Montserrat eyebrow in sentence case, Copperplate 105px/75px headline and a
 * square Archivo button.
 */
export default function Hero({ eyebrow, title, subtitle, image, ctaLabel, ctaHref, size = "tall" }: Props) {
  return (
    <section
      className={`relative flex items-center justify-center text-center text-white ${
        size === "full" ? "min-h-screen" : "min-h-[540px] lg:min-h-[700px]"
      }`}
      style={{
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0a416c",
      }}
    >
      {/* Flat 50% black overlay, exactly as the original */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative px-6 py-20 w-full max-w-[860px] flex flex-col gap-[30px]">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="hero-title whitespace-pre-line">{title}</h1>
        {subtitle && <p className="text-lg lg:text-xl leading-[25px] lg:leading-[38px]">{subtitle}</p>}
        {ctaLabel && ctaHref && (
          <div>
            <Link href={ctaHref} className="btn-brand">{ctaLabel}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
