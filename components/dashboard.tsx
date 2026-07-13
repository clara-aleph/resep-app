"use client";

import Link from "next/link";
import { Search, Soup, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddRecipeCard } from "@/components/add-recipe-card";
import { getRecipes, Recipe } from "@/lib/recipes";

export function Dashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showTriedOnly, setShowTriedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [status, setStatus] = useState("Memuat koleksi resep...");

  useEffect(() => {
    getRecipes().then((data) => { setRecipes(data); setStatus(""); }).catch(() => setStatus("Koleksi belum dapat dimuat. Periksa koneksi database Anda."));
  }, []);

  const categories = useMemo(() => [...new Set(recipes.flatMap((recipe) => recipe.categories))].sort((first, second) => first.localeCompare(second, "id")), [recipes]);
  const filtered = recipes
    .filter((recipe) => !selectedCategory || recipe.categories.includes(selectedCategory))
    .filter((recipe) => !showTriedOnly || recipe.is_tried)
    .filter((recipe) => `${recipe.title} ${recipe.ingredients_list.join(" ")} ${recipe.categories.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const triedCount = recipes.filter((recipe) => recipe.is_tried).length;

  return <main className="min-h-screen bg-[#fffaf5] px-4 py-6 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-10 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-stone-900"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-600 text-white"><Soup size={22}/></span>Koleksi Resepku</Link><button onClick={() => setShowSearch(!showSearch)} className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-orange-800 shadow-sm"><Search className="mr-1.5 inline" size={16}/>Cari Bahan/Resep</button></header>
    {showSearch && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-orange-200 bg-white p-3 shadow-sm"><Search className="ml-1 text-orange-500" size={19}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bahan atau resep, misalnya labu..." className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"/><button onClick={() => { setQuery(""); setShowSearch(false); }} aria-label="Tutup pencarian" className="p-2 text-stone-500"><X size={18}/></button></div>}
    <section aria-label="Filter resep" className="mb-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2"><label className="text-sm font-bold text-stone-800">Filter kategori<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-normal outline-orange-400"><option value="">Semua kategori</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><div className="border-t border-stone-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><p className="text-sm font-bold text-stone-800">Filter status</p><button onClick={() => setShowTriedOnly((current) => !current)} className={`mt-2 w-full rounded-xl px-3 py-2 text-sm font-bold ${showTriedOnly ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-800"}`}>✓ {showTriedOnly ? "Menampilkan yang sudah dicoba" : "Tampilkan yang Sudah Dicoba"} ({triedCount})</button></div></section>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]"><AddRecipeCard categories={categories} onCreated={(recipe) => setRecipes((current) => [recipe, ...current])}/><section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold text-orange-700">ARSIP DAPUR</p><h1 className="text-3xl font-bold text-stone-950">Resep tersimpan</h1></div><span className="text-sm text-stone-500">{filtered.length} resep</span></div>
      {status ? <p className="rounded-2xl bg-white p-5 text-sm text-stone-600 shadow-sm">{status}</p> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center"><p className="font-semibold text-stone-800">Belum ada resep yang cocok.</p><p className="mt-1 text-sm text-stone-600">Coba kata kunci lain atau ubah filter.</p></div> : <div className="grid gap-4 sm:grid-cols-2">{filtered.map((recipe) => <Link key={recipe.id} href={`/resep/${recipe.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-md">{recipe.cover_image_url ? <img src={recipe.cover_image_url} alt={`Foto ${recipe.title}`} className="h-36 w-full object-cover"/> : <div className="grid h-36 place-items-center bg-orange-100 text-orange-500"><Soup size={32}/></div>}<div className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-orange-700">{recipe.categories[0] || "Tanpa kategori"}</p>{recipe.is_tried && <span className="text-xs font-bold text-emerald-700">✓ Sudah dicoba</span>}</div><h2 className="mt-1 font-bold text-stone-900 group-hover:text-orange-700">{recipe.title}</h2><p className="mt-2 text-xs text-stone-500">{recipe.ingredients_list.length} bahan · {recipe.instructions_list.length} langkah</p></div></Link>)}</div>}</section></div>
  </div></main>;
}
