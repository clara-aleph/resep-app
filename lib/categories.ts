export const kategoriAwal = ["Indonesia", "India", "Chinese Food", "Baking/Kue", "Masak Harian"];

export function tampilkanKategori(category: string) {
  if (category === "Makanan Indonesia") return "Indonesia";
  if (category === "Makanan India") return "India";
  return category;
}
