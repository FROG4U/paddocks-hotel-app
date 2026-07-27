"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NavItem } from "@/lib/data";

type Props = {
  nav: NavItem[];
  logoUrl: string;
  siteName: string;
  ctaLabel: string;
  ctaHref: string;
};

export default function SiteHeader({ nav, logoUrl, siteName, ctaLabel, ctaHref }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <header className="bg-navy text-white sticky top-0 z-50 shadow-md">
      <div className="mx-auto max-w-6xl px-4">
        {/* Logo */}
        <div className="flex justify-center pt-4 pb-2">
          <Link href="/" aria-label={siteName}>
            <Image src={logoUrl} alt={siteName} width={150} height={90}
              className="h-16 w-auto object-contain" priority />
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center justify-center gap-8 pb-3">
          {nav.map((item) => (
            <div key={item.label} className="relative group">
              <Link
                href={item.href}
                className="nav-link text-gold hover:text-white transition-colors py-2 inline-block"
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full min-w-[210px]
                  opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible
                  group-hover:translate-y-0 transition-all duration-200 pt-1 z-50">
                  <ul className="bg-white text-ink rounded-b-md shadow-xl py-2">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href}
                          className="block px-5 py-2.5 text-sm whitespace-nowrap hover:bg-cream hover:text-accent transition-colors">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {ctaLabel && (
            <Link href={ctaHref}
              className="nav-link bg-tan text-navy px-5 py-2.5 rounded-sm hover:brightness-95 transition">
              {ctaLabel}
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <div className="lg:hidden flex justify-center pb-3">
          <button aria-label="Menu" aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-gold p-2">
            {open ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="lg:hidden bg-white text-ink border-t border-black/10">
          <ul className="divide-y divide-black/5">
            {nav.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                      className="w-full flex justify-between items-center px-6 py-3.5 text-left font-semibold text-navy">
                      {item.label}
                      <span className={`transition-transform ${expanded === item.label ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {expanded === item.label && (
                      <ul className="bg-cream/60">
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link href={c.href} onClick={() => setOpen(false)}
                              className="block px-9 py-3 text-sm text-ink hover:text-accent">
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link href={item.href} onClick={() => setOpen(false)}
                    className="block px-6 py-3.5 font-semibold text-navy">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
            {ctaLabel && (
              <li className="p-4">
                <Link href={ctaHref} onClick={() => setOpen(false)}
                  className="block text-center bg-tan text-navy font-semibold px-5 py-3 rounded-sm nav-link">
                  {ctaLabel}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
