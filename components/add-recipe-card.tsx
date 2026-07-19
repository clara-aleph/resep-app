"use client";

import { ImageUp, LoaderCircle, WandSparkles } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { CategoryCombobox } from "@/components/category-combobox";
import { createRecipe, Recipe, uploadRecipeImage } from "@/lib/recipes";
import { terjemahkanKeIndonesiaMock } from "@/lib/text-services";

// Hanya hilangkan bullet atau nomor urut yang diikuti spasi; angka takaran seperti "100g" harus tetap utuh.
const splitLines = (text: string) => text.split("\n").map((line) => line.replace(/^\s*(?:(?:[-•*])\s+|\d+[.)]\s+)/, "").trim()).filter(Boolean);

async function enhanceHandwritingPhoto(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("Foto tidak dapat dibaca.")); element.src = sourceUrl;
    });
    const scale = Math.min(2, 3600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Foto tidak dapat diproses.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = 0.299 * pixels.data[index] + 0.587 * pixels.data[index + 1] + 0.114 * pixels.data[index + 2];
      const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.85 + 128));
      pixels.data[index] = enhanced; pixels.data[index + 1] = enhanced; pixels.data[index + 2] = enhanced;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(sourceUrl); }
}

export function AddRecipeCard({ categories, onCreated }: { categories: string[]; onCreated: (recipe: Recipe) => void }) {
  const [mode, setMode] = useState<"tautan" | "foto">("tautan");
  const [url, setUrl] = useState(""); const [title, setTitle] = useState(""); const [category, setCategory] = useState("");
  const [cover, setCover] = useState<string | null>(null); const [text, setText] = useState(""); const [ingredients, setIngredients] = useState(""); const [instructions, setInstructions] = useState("");
  const [sourcePhoto, setSourcePhoto] = useState<File | null>(null);
  const [status, setStatus] = useState(""); const [loading, setLoading] = useState(false);

  async function ambilTautan(videoUrl = url) {
    if (!videoUrl.trim()) return setStatus("Masukkan tautan video terlebih dahulu.");
    setLoading(true); setStatus("Sedang menganalisis video, memisahkan bahan, dan menerjemahkan resep...");
    try {
      const [response, oembedResponse] = await Promise.all([
        fetch("/api/analyze-cooking-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: videoUrl }) }),
        fetch(`/api/oembed?url=${encodeURIComponent(videoUrl)}`),
      ]);
      const analyzed = await response.json(); const oembed = await oembedResponse.json();
      if (!response.ok) throw new Error(analyzed.error);
      setTitle((current) => current || analyzed.title || oembed.title || "Resep dari video"); setCover(analyzed.thumbnail_url ?? oembed.thumbnail_url ?? null); setText(analyzed.mock ? "Data contoh ditampilkan karena kunci Gemini belum diatur." : "Resep berhasil dianalisis dari video oleh Gemini.");
      setIngredients(analyzed.bahan.join("\n")); setInstructions(analyzed.cara_membuat.join("\n")); setStatus(analyzed.mock ? "Data contoh resep telah diisi. Tambahkan kunci Gemini untuk analisis video asli." : "Resep berhasil dianalisis. Periksa sebelum menyimpan.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Tautan tidak dapat diproses."); } finally { setLoading(false); }
  }
  async function bacaFoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setLoading(true); setStatus("Meningkatkan kontras dan membaca tulisan resep berbahasa Indonesia...");
    try {
      const enhancedPhoto = await enhanceHandwritingPhoto(file);
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("ind");
      await worker.setParameters({ user_defined_dpi: "300", preserve_interword_spaces: "1", tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const scatteredText = (await worker.recognize(enhancedPhoto)).data.text;
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const blockText = (await worker.recognize(enhancedPhoto)).data.text;
      await worker.terminate();
      const translated = await terjemahkanKeIndonesiaMock(scatteredText.length >= blockText.length ? scatteredText : blockText);
      setText(translated); setTitle((current) => current || file.name.replace(/\.[^/.]+$/, "")); setCover(URL.createObjectURL(file)); setSourcePhoto(file);
      setStatus("Teks berhasil dibaca dengan mode tulisan tangan. Tinjau dan pisahkan bahan serta langkahnya sebelum menyimpan.");
    } catch { setStatus("Foto belum dapat dibaca. Coba foto yang lebih terang dan tajam."); } finally { setLoading(false); }
  }
  async function simpan() {
    if (!title.trim()) return setStatus("Judul resep wajib diisi.");
    setLoading(true); setStatus("Menyimpan resep...");
    try {
      const sourceImageUrl = sourcePhoto ? await uploadRecipeImage(sourcePhoto) : null;
      const recipe = await createRecipe({ title: title.trim(), source_url: mode === "tautan" ? url.trim() || null : null, cover_image_url: sourceImageUrl ?? cover, source_image_url: sourceImageUrl, extracted_text: text || null, ingredients_list: splitLines(ingredients), instructions_list: splitLines(instructions), categories: category ? [category] : [] });
      onCreated(recipe); setStatus("Resep berhasil disimpan."); setTitle(""); setUrl(""); setCover(null); setText(""); setIngredients(""); setInstructions(""); setCategory(""); setSourcePhoto(null);
    } catch { setStatus("Resep belum dapat disimpan. Periksa koneksi database Anda."); } finally { setLoading(false); }
  }
  return <section className="w-full max-w-2xl justify-self-start rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
    <div className="mb-6"><h2 className="text-3xl font-bold text-stone-900">Tambah Resep</h2></div>
    <div className="mb-5 grid grid-cols-2 rounded-xl bg-orange-50 p-1"><button onClick={() => { setMode("tautan"); setSourcePhoto(null); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "tautan" ? "bg-white text-orange-700 shadow-sm" : "text-stone-600"}`}>Simpan Tautan Video</button><button onClick={() => setMode("foto")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "foto" ? "bg-white text-orange-700 shadow-sm" : "text-stone-600"}`}>Unggah Foto Resep</button></div>
    {mode === "tautan" ? <div className="w-full"><div className="flex flex-col gap-3"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Tempelkan tautan video YouTue...." className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-orange-400"/><button onClick={() => ambilTautan()} disabled={loading} className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">Analisis Video</button></div>{loading && status && <p role="status" className="mt-3 text-sm text-stone-600"><LoaderCircle className="mr-1 inline animate-spin" size={15}/> {status}</p>}</div> : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-6 text-sm font-semibold text-orange-800"><ImageUp size={18}/>Pilih foto catatan resep<input type="file" accept="image/*" onChange={bacaFoto} className="hidden" /></label>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Judul resep<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Sayur Labu Santan" className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label><label className="text-sm font-medium">Kategori<div className="mt-1.5"><CategoryCombobox value={category} onChange={setCategory} categories={categories}/></div></label></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Bahan-bahan<textarea value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="Satu bahan per baris" rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label><label className="text-sm font-medium">Langkah-langkah<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Satu langkah per baris" rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label></div>
    {text && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600"><WandSparkles className="mr-1 inline text-orange-500" size={15}/>{text}</p>}
    {status && !(mode === "tautan" && loading) && <p role="status" className="mt-4 text-sm text-stone-600">{loading && <LoaderCircle className="mr-1 inline animate-spin" size={15}/>} {status}</p>}
    <button onClick={simpan} disabled={loading} className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Simpan Resep</button>
  </section>;
}
