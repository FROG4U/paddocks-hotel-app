import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

// Copperplate — the Paddocks brand heading font (from Copperplate.ttc).
const copperplate = localFont({
  src: [
    { path: "../public/fonts/copperplate-1.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/copperplate-0.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/copperplate-2.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-slab",
  display: "swap",
});

// Static default metadata (no DB) so the build never needs a database.
// Per-page + site-wide dynamic titles come from the (public) layout & pages.
export const metadata: Metadata = {
  title: "The Paddocks Hotel — Ross-on-Wye",
  description:
    "The Paddocks Hotel & Indian Restaurant in the heart of Ross-on-Wye. Rooms, weddings, celebrations, dining and more.",
  icons: { icon: "/brand/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${poppins.variable} ${copperplate.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
