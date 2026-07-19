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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
