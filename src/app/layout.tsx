import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono, Titan_One } from "next/font/google";
import "./globals.css";

const display = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500", "700"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kalko.webflow.io";
const description = "Lanza una foto o una idea al portal y recibe cuatro stickers troquelados generados con IA, listos para imprimir.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Kalko · Laboratorio de stickers",
  description,
  openGraph: { title: "Kalko · Tu sticker ya existe en otra dimensión", description, type: "website", locale: "es" },
  twitter: { card: "summary_large_image", title: "Kalko · Laboratorio de stickers", description },
};

export const viewport: Viewport = {
  themeColor: "#05130f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
