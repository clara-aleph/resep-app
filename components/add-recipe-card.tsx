"use client";

import { ImageUp, LoaderCircle, WandSparkles } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { CategoryCombobox } from "@/components/category-combobox";
import { createRecipe, Recipe, uploadRecipeImage } from "@/lib/recipes";

// Hanya hilangkan bullet atau nomor urut yang diikuti spasi; angka takaran seperti "100g" harus tetap utuh.
const splitLines = (text: string) => text.split("\n").map((line) => line.replace(/^\s*(?:(?:[-•*])\s+|\d+[.)]\s+)/, "").trim()).filter(Boolean);
const MAX_ANALYSIS_IMAGE_BYTES = 2_800_000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Foto tidak dapat dikompres.")), "image/jpeg", quality);
  });
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}

async function compressRecipePhoto(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("Foto tidak dapat dibaca.")); element.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    const sizes = [2_000, 1_800, 1_600, 1_400, 1_200];
    const qualities = [0.86, 0.82, 0.78, 0.74, 0.7];

    for (let index = 0; index < sizes.length; index += 1) {
      const scale = Math.min(1, sizes[index] / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Foto tidak dapat diproses.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = await canvasToBlob(canvas, qualities[index]);
      if (compressed.size <= MAX_ANALYSIS_IMAGE_BYTES) return readBlobAsDataUrl(compressed);
    }

    throw new Error("Foto terlalu besar untuk dianalisis. Gunakan foto yang lebih dekat atau potong bagian resepnya.");
  } finally { URL.revokeObjectURL(sourceUrl); }
}

export function AddRecipeCard({ categories, onCreated }: { categories: string[]; onCreated: (recipe: Recipe) => void }) {
  const [mode, setMode] = useState<"tautan" | "foto">("tautan");
  const [url, setUrl] = useState(""); const [title, setTitle] = useState(""); const [category, setCategory] = useState("");
  const [cover, setCover] = useState<string | null>(null); const [text, setText] = useState(""); const [ingredients, setIngredients] = useState(""); const [instructions, setInstructions] = useState("");
  const [sourcePhoto, setSourcePhoto] = useState<File | null>(null);
  const [status, setStatus] = useState(""); const [loading, setLoading] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

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
    setTitle((current) => current || file.name.replace(/\.[^/.]+$/, "")); setCover(URL.createObjectURL(file)); setSourcePhoto(file);
    setLoading(true); setIsAnalyzingPhoto(true); setStatus("Sedang membaca tulisan tangan dan menyusun resep...");
    try {
      const image = await compressRecipePhoto(file);
      const response = await fetch("/api/analyze-recipe-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const analyzed = await response.json();
      if (!response.ok) throw new Error(analyzed.error);
      setIngredients(analyzed.bahan.join("\n")); setInstructions(analyzed.cara_membuat.join("\n"));
      setText("Resep tulisan tangan telah dianalisis oleh Gemini. Periksa sebelum menyimpan.");
      setStatus("Resep berhasil dibaca. Periksa bahan dan langkah sebelum menyimpan.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Foto belum dapat dibaca. Coba foto yang lebih terang dan tajam."); } finally { setLoading(false); setIsAnalyzingPhoto(false); }
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
    {mode === "tautan" ? <div className="w-full"><div className="flex flex-col gap-3"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Tempelkan tautan video YouTue...." className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-orange-400"/><button onClick={() => ambilTautan()} disabled={loading} className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">Analisis Video</button></div>{loading && status && <p role="status" className="mt-3 text-sm text-stone-600"><LoaderCircle className="mr-1 inline animate-spin" size={15}/> {status}</p>}</div> : <div><label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-6 text-sm font-semibold text-orange-800 ${isAnalyzingPhoto ? "pointer-events-none opacity-60" : ""}`}><ImageUp size={18}/>Pilih foto catatan resep<input type="file" accept="image/*" onChange={bacaFoto} disabled={isAnalyzingPhoto} className="hidden" /></label>{isAnalyzingPhoto && status && <p role="status" className="mt-3 text-sm text-stone-600"><LoaderCircle className="mr-1 inline animate-spin" size={15}/> {status}</p>}</div>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Judul resep<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Sayur Labu Santan" className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label><label className="text-sm font-medium">Kategori<div className="mt-1.5"><CategoryCombobox value={category} onChange={setCategory} categories={categories}/></div></label></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Bahan-bahan<textarea value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="Satu bahan per baris" rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label><label className="text-sm font-medium">Langkah-langkah<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Satu langkah per baris" rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-stone-300 px-3 py-2.5 outline-orange-400"/></label></div>
    {text && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600"><WandSparkles className="mr-1 inline text-orange-500" size={15}/>{text}</p>}
    {status && !(mode === "tautan" && loading) && !isAnalyzingPhoto && <p role="status" className="mt-4 text-sm text-stone-600">{loading && <LoaderCircle className="mr-1 inline animate-spin" size={15}/>} {status}</p>}
    <button onClick={simpan} disabled={loading} className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Simpan Resep</button>
  </section>;
}
