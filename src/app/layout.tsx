import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono, Titan_One } from "next/font/google";
import "./globals.css";

const display = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Kalko · Laboratorio de stickers",
  description: "Lanza una idea o una imagen al portal y recibe cuatro stickers troquelados generados con IA.",
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
