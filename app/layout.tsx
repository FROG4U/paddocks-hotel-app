import type { Metadata } from "next";
import { Poppins, Roboto_Slab } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});
const slab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-slab",
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
    <html lang="en-GB" className={`${poppins.variable} ${slab.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
