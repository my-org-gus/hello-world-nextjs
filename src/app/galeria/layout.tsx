import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galería · Kalko",
  description: "Stickers que la comunidad sacó del laboratorio de Kalko.",
};

export default function GaleriaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
