import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Koleksi Resepku",
    short_name: "Resepku",
    description: "Simpan dan susun resep kesayanganmu.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf5",
    theme_color: "#f97316",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
