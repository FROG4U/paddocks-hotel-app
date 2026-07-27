import type { Metadata } from "next";
import { Poppins, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/data";

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

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    icons: { icon: s.logoUrl },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${poppins.variable} ${slab.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
