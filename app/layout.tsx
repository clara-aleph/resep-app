import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n-provider";
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
    icon: [{ url: "/icon-512.png", type: "image/png", sizes: "512x512" }],
    shortcut: ["/icon-192.png"],
    apple: [{ url: "/icon-512.png", type: "image/png", sizes: "512x512" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
