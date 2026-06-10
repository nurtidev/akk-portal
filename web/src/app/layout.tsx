import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "АКК — Аграрная кредитная корпорация",
  description: "Подбор программы финансирования АПК Казахстана",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
