import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koleksi Resepku",
  description: "Simpan dan susun resep kesayanganmu",
  manifest: "/manifest.webmanifest",
  applicationName: "Koleksi Resepku",
  appleWebApp: {
    capable: true,
    title: "Koleksi Resepku",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
