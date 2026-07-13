import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koleksi Resepku",
  description: "Simpan dan susun resep kesayanganmu",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
