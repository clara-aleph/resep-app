export async function ekstrakTranskripVideoMock() {
  await new Promise((resolve) => setTimeout(resolve, 750));
  return {
    bahan: ["2 siung bawang putih", "1 buah bawang bombai", "Garam secukupnya"],
    langkah: ["Siapkan semua bahan.", "Masak sambil diaduk hingga harum.", "Sajikan selagi hangat."],
    teks: "Transkrip contoh dibuat dari video. Silakan periksa dan sunting bahan serta langkahnya.",
  };
}

export async function terjemahkanKeIndonesiaMock(text: string) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return text
    .replace(/ingredients/gi, "bahan-bahan")
    .replace(/instructions/gi, "langkah-langkah")
    .replace(/salt/gi, "garam")
    .replace(/sugar/gi, "gula")
    .replace(/chicken/gi, "ayam");
}
