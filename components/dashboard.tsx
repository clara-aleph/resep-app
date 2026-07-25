"use client";

import Link from "next/link";
import { ArrowUp, Search, Soup, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddRecipeCard } from "@/components/add-recipe-card";
import { getRecipes, Recipe } from "@/lib/recipes";

type SourceFilter = "semua" | "video" | "manual";

export function Dashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [showTriedOnly, setShowTriedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("semua");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [status, setStatus] = useState("Memuat koleksi resep...");

  useEffect(() => {
    getRecipes().then((data) => { setRecipes(data); setStatus(""); }).catch(() => setStatus("Koleksi belum dapat dimuat. Periksa koneksi database Anda."));
  }, []);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 240);
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  const categories = useMemo(() => [...new Set(recipes.flatMap((recipe) => recipe.categories))].sort((first, second) => first.localeCompare(second, "id")), [recipes]);
  const filtered = recipes
    .filter((recipe) => !selectedCategory || recipe.categories.includes(selectedCategory))
    .filter((recipe) => !showTriedOnly || recipe.is_tried)
    .filter((recipe) => sourceFilter === "semua" || (sourceFilter === "video" ? Boolean(recipe.source_url) : !recipe.source_url))
    .filter((recipe) => `${recipe.title} ${recipe.ingredients_list.join(" ")} ${recipe.instructions_list.join(" ")} ${recipe.categories.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return <main className="min-h-screen bg-[#fffaf5] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex items-center gap-3"><Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-stone-900"><img src="/icon.svg" alt="" className="h-10 w-10 rounded-2xl"/>Koleksi Resepku</Link></header>
    <div className="space-y-10">
      <AddRecipeCard categories={categories} onCreated={(recipe) => setRecipes((current) => [recipe, ...current])}/>
      <section className="w-full"><div className="mb-4 flex items-end justify-between gap-3"><h1 className="text-3xl font-bold text-stone-950">Resep tersimpan</h1><span className="shrink-0 text-base text-stone-500">{filtered.length} resep</span></div>
        <section aria-label="Pencarian dan filter resep" className="sticky top-0 z-20 -mx-4 mb-5 w-[calc(100%+2rem)] border-y border-stone-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:mx-0 sm:w-auto sm:rounded-2xl sm:border sm:p-3"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-600" size={19}/><input aria-label="Cari bahan atau resep" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bahan atau resep" className="w-full rounded-xl border border-orange-200 bg-orange-50 py-2.5 pl-10 pr-11 text-base text-stone-900 outline-orange-400 placeholder:text-stone-500"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 hover:bg-orange-100 hover:text-stone-800"><X size={20}/></button>}</div><div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto whitespace-nowrap pb-1"><select aria-label="Filter kategori" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="h-11 shrink-0 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 outline-orange-400"><option value="">Semua Kategori</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><button type="button" aria-label="Filter resep disukai" aria-pressed={showTriedOnly} onClick={() => setShowTriedOnly((current) => !current)} className={`h-11 shrink-0 rounded-full px-4 text-sm font-bold ${showTriedOnly ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-800"}`}>Suka Resep Ini ❤️</button><select aria-label="Filter sumber resep" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)} className="h-11 shrink-0 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 outline-orange-400"><option value="semua">Semua Sumber</option><option value="video">Video</option><option value="manual">Manual/Foto</option></select></div></section>
        {status ? <p className="rounded-2xl bg-white p-5 text-base text-stone-600 shadow-sm">{status}</p> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center"><p className="font-semibold text-stone-800">Belum ada resep yang cocok.</p><p className="mt-1 text-base text-stone-600">Coba kata kunci lain atau ubah filter.</p></div> : <div className="grid gap-4 px-1 sm:grid-cols-2 sm:px-0 xl:grid-cols-3">{filtered.map((recipe) => <Link key={recipe.id} href={`/resep/${recipe.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-md">{recipe.cover_image_url ? <img src={recipe.cover_image_url} alt={`Foto ${recipe.title}`} className="h-36 w-full object-cover"/> : <div className="grid h-36 place-items-center bg-orange-100 text-orange-500"><Soup size={32}/></div>}<div className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-base font-semibold text-orange-700">{recipe.categories[0] || "Tanpa kategori"}</p>{recipe.is_tried && <span className="text-base font-bold text-emerald-700">❤️ Suka Resep Ini</span>}</div><h2 className="mt-1 text-lg font-bold text-stone-900 group-hover:text-orange-700">{recipe.title}</h2><p className="mt-2 text-base text-stone-500">{recipe.ingredients_list.length} bahan · {recipe.instructions_list.length} langkah</p></div></Link>)}</div>}</section>
    </div>
    {showBackToTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Kembali ke atas" className="fixed bottom-5 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"><ArrowUp size={26}/></button>}
  </div></main>;
}
