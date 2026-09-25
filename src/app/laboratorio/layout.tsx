import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laboratorio · Kalko",
};

export default function LaboratorioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
