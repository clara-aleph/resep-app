"use client";

import Link from "next/link";
import { ArrowUp, BookOpen, Heart, Plus, Search, Soup, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddRecipeCard } from "@/components/add-recipe-card";
import { LanguageSwitcher, useI18n } from "@/components/i18n-provider";
import { useRecipeTranslations } from "@/components/use-recipe-translation";
import { tampilkanKategori } from "@/lib/categories";
import { getRecipes, Recipe } from "@/lib/recipes";

type SourceFilter = "semua" | "video" | "manual";

export function Dashboard() {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [showTriedOnly, setShowTriedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("semua");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<"koleksi" | "tambah">("koleksi");
  const [status, setStatus] = useState("Memuat koleksi resep...");
  const filterSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRecipes()
      .then((data) => {
        setRecipes(data);
        setStatus("");
      })
      .catch(() => setStatus("Koleksi belum dapat dimuat. Periksa koneksi database Anda."));
  }, []);

  useEffect(() => {
    const sentinel = filterSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setIsFilterSticky(!entry.isIntersecting), { threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 240);
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  const categories = useMemo(
    () => [...new Set(recipes.flatMap((recipe) => recipe.categories.map(tampilkanKategori)))].sort((first, second) => first.localeCompare(second, "id")),
    [recipes],
  );
  const filtered = recipes
    .filter((recipe) => !selectedCategory || recipe.categories.some((category) => tampilkanKategori(category) === selectedCategory))
    .filter((recipe) => !showTriedOnly || recipe.is_tried)
    .filter((recipe) => sourceFilter === "semua" || (sourceFilter === "video" ? Boolean(recipe.source_url) : !recipe.source_url))
    .filter((recipe) => `${recipe.title} ${recipe.ingredients_list.join(" ")} ${recipe.instructions_list.join(" ")} ${recipe.categories.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const hasActiveFilters = Boolean(query || selectedCategory || showTriedOnly || sourceFilter !== "semua");
  const { translations, isTranslating } = useRecipeTranslations(filtered);
  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setShowTriedOnly(false);
    setSourceFilter("semua");
  };

  const stickyFilterClasses = isFilterSticky
    ? "-mx-4 w-[calc(100%+2rem)] rounded-none border-x-0 border-t-0 py-0 shadow-md md:ml-[calc((100%-100vw)/2)] md:mr-0 md:w-screen md:translate-x-0 md:border-x-0"
    : "mx-auto w-full max-w-6xl rounded-2xl shadow-sm";
  const filterInnerClasses = isFilterSticky ? "px-4 py-3 md:mx-auto md:max-w-6xl md:px-8" : "p-3";

  return (
    <main className="min-h-screen bg-[#fffaf5] px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/recipe-book-logo.png" alt="" className="h-11 w-11 shrink-0 rounded-2xl" />
            <div className="leading-tight">
              <Link href="/" className="block text-xl font-black tracking-tight text-stone-900">{t("appName")}</Link>
              <button type="button" onClick={() => setShowAuthorModal(true)} className="mt-px block text-left text-xs leading-none text-stone-500 hover:text-orange-700 hover:underline">{t("createdBy")}</button>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <div className="space-y-10">
          <div className={mobileTab === "tambah" ? "block md:block" : "hidden md:block"}>
            <AddRecipeCard categories={categories} onCreated={(recipe) => { setRecipes((current) => [recipe, ...current]); setMobileTab("koleksi"); }} />
          </div>

          <section className={`w-full ${mobileTab === "koleksi" ? "block md:block" : "hidden md:block"}`}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h1 className="text-3xl font-bold text-stone-950">{t("savedRecipes")}</h1>
              <span className="shrink-0 text-base text-stone-500">{filtered.length} {t("recipes")}</span>
            </div>
            <div ref={filterSentinelRef} aria-hidden="true" className="h-px" />

            <section
              aria-label="Pencarian dan filter resep"
              className={`sticky top-0 z-20 mb-5 border border-stone-200 bg-white/95 backdrop-blur transition-[box-shadow,border-radius] duration-200 ${stickyFilterClasses} ${isFilterSticky ? "desktop-sticky-slide-down" : ""}`}
            >
              <div className={filterInnerClasses}>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-orange-600" size={19} />
                  <input
                    aria-label={t("searchRecipes")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("searchRecipes")}
                    className="w-full rounded-xl border border-orange-200 bg-orange-50 py-2.5 pl-10 pr-11 text-base text-stone-900 outline-orange-400 placeholder:text-stone-500"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label={t("clearSearch")} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 hover:bg-orange-100 hover:text-stone-800">
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="mt-2 flex min-w-0 gap-2">
                  {hasActiveFilters && (
                    <button type="button" onClick={resetFilters} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-4 text-sm font-bold text-white hover:bg-orange-600">
                      {t("reset")} <X aria-hidden="true" size={16} />
                    </button>
                  )}
                  <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto">
                    <div className="flex w-max gap-2 whitespace-nowrap pb-1">
                      <button
                        type="button"
                        aria-label={t("favoriteRecipes")}
                        aria-pressed={showTriedOnly}
                        onClick={() => setShowTriedOnly((current) => !current)}
                        className={`h-11 shrink-0 rounded-full px-4 text-sm font-bold ${showTriedOnly ? "bg-orange-500 text-white" : "border border-orange-300 bg-white text-orange-800"}`}
                      >
                        {t("favoriteRecipes")}
                      </button>
                      <select
                        aria-label="Filter kategori"
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold outline-orange-400 ${selectedCategory ? "bg-orange-500 text-white" : "border border-orange-300 bg-white text-orange-800"}`}
                      >
                        <option value="">{t("allCategories")}</option>
                        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                      <select
                        aria-label="Filter sumber resep"
                        value={sourceFilter}
                        onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
                        className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold outline-orange-400 ${sourceFilter !== "semua" ? "bg-orange-500 text-white" : "border border-orange-300 bg-white text-orange-800"}`}
                      >
                        <option value="semua">{t("allSources")}</option>
                        <option value="video">{t("video")}</option>
                        <option value="manual">{t("manualPhoto")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {status ? (
              <p className="rounded-2xl bg-white p-5 text-base text-stone-600 shadow-sm">{status}</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center">
                <p className="font-semibold text-stone-800">{t("noRecipes")}</p>
                <p className="mt-1 text-base text-stone-600">{t("noRecipesHint")}</p>
              </div>
            ) : (
              <div className="grid gap-4 px-1 sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
                {filtered.map((recipe) => {
                  const primaryCoverImage = recipe.cover_image_url;
                  const translatedRecipe = translations[recipe.id];
                  return (
                  <Link key={recipe.id} href={`/resep/${recipe.id}`} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-md">
                    {primaryCoverImage ? (
                      <img src={primaryCoverImage} alt={`Foto ${recipe.title}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/recipe-placeholder.svg"; }} className="h-36 w-full object-cover" />
                    ) : (
                      <div className="grid h-36 place-items-center bg-orange-100 text-orange-500"><Soup size={32} /></div>
                    )}
                    {recipe.is_tried && <span aria-label={t("favoriteRecipes")} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white p-1 text-rose-500 shadow-sm"><Heart aria-hidden="true" size={19} fill="currentColor" /></span>}
                    <div className="p-4">
                      <p className="text-base font-semibold text-orange-700">{tampilkanKategori(recipe.categories[0] || t("uncategorized"))}</p>
                      {isTranslating && !translatedRecipe ? <div aria-label="Menerjemahkan resep" className="mt-2 h-7 w-4/5 animate-pulse rounded bg-stone-200" /> : <h2 className="mt-1 text-lg font-bold text-stone-900 group-hover:text-orange-700">{translatedRecipe?.title ?? recipe.title}</h2>}
                      <p className="mt-2 text-base text-stone-500">{recipe.ingredients_list.length} {t("ingredients")} · {recipe.instructions_list.length} {t("steps")}</p>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {showBackToTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t("backToTop")} className="fixed bottom-5 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200">
            <ArrowUp size={26} />
          </button>
        )}
      </div>
      {showAuthorModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="author-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAuthorModal(false); }} className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setShowAuthorModal(false)} aria-label="Tutup" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-orange-50 hover:text-stone-900"><X size={20}/></button>
            <h2 id="author-modal-title" className="pr-10 text-xl font-black text-stone-900">Clara Wijaya</h2>
            <p className="mt-2 text-base text-stone-600">Hubungi pembuat aplikasi ini melalui:</p>
            <div className="mt-5 grid gap-3">
              <a href="https://www.linkedin.com/in/clarawijaya" target="_blank" rel="noreferrer" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-base font-bold text-orange-800 hover:bg-orange-100">LinkedIn</a>
              <a href="mailto:clendy.cecewe@gmail.com" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-base font-bold text-orange-800 hover:bg-orange-100">Email</a>
            </div>
          </div>
        </div>
      )}
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-orange-100 bg-white/95 px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(120,53,15,0.08)] backdrop-blur md:hidden">
        <button type="button" onClick={() => setMobileTab("koleksi")} aria-current={mobileTab === "koleksi" ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-bold ${mobileTab === "koleksi" ? "text-orange-600" : "text-stone-500"}`}><BookOpen size={21}/><span>Koleksi</span></button>
        <button type="button" onClick={() => setMobileTab("tambah")} aria-current={mobileTab === "tambah" ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-bold ${mobileTab === "tambah" ? "text-orange-600" : "text-stone-500"}`}><Plus size={22}/><span>Tambah</span></button>
      </nav>
    </main>
  );
}
