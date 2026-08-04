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

export default function Hero({ eyebrow, title, subtitle, image, ctaLabel, ctaHref, size = "tall" }: Props) {
  return (
    <section
      className={`relative flex items-center justify-center text-center text-white ${
        size === "full" ? "min-h-[82vh]" : "min-h-[62vh]"
      }`}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,.30), rgba(0,0,0,.42))${image ? `, url(${image})` : ""}`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0a416c",
      }}
    >
      <div className="px-6 py-20 max-w-3xl">
        {eyebrow && <p className="text-lg sm:text-2xl mb-4 font-light drop-shadow">{eyebrow}</p>}
        <h1 className="hero-title text-5xl sm:text-7xl lg:text-8xl uppercase drop-shadow-lg">{title}</h1>
        {subtitle && <p className="mt-6 text-xl sm:text-2xl font-light drop-shadow">{subtitle}</p>}
        {ctaLabel && ctaHref && (
          <Link href={ctaHref}
            className="inline-block mt-10 bg-tan text-navy nav-link px-10 py-4 rounded-sm hover:brightness-95 transition">
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
