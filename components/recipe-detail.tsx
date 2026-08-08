"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ExternalLink, ImageUp, Pencil, Printer, RotateCcw, Save, Soup, Trash2 } from "lucide-react";
import { ChangeEvent, SyntheticEvent, useEffect, useRef, useState } from "react";
import { CategoryCombobox } from "@/components/category-combobox";
import { LanguageSwitcher, useI18n } from "@/components/i18n-provider";
import { tampilkanKategori } from "@/lib/categories";
import { deleteRecipe, deleteRecipeImage, getRecipe, getRecipes, Recipe, updateRecipe, uploadRecipeImage } from "@/lib/recipes";

const lines = (values: string[]) => values.join("\n");
const toList = (value: string) => value.split("\n").map((item) => item.replace(/^\s*(?:(?:[-•*])\s+|\d+[.)]\s+)/, "").trim()).filter(Boolean);
const formatTanggalIndonesia = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
const gunakanPlaceholder = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.onerror = null; event.currentTarget.src = "/recipe-placeholder.svg"; };
const pesanKegagalan = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Penyimpanan tidak dapat dihubungi.";
};
function sumberResep(sourceUrl: string | null) {
  if (!sourceUrl) return "Foto/Manual";
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be" || host.includes("youtube.com")) return "YouTube";
    if (host === "fb.watch" || host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    return "Video";
  } catch { return "Foto/Manual"; }
}

type SaveToast = { message: string; tone: "loading" | "success" | "error" };

export function RecipeDetail({ id }: { id: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [edit, setEdit] = useState(false);
  const [status, setStatus] = useState("Memuat resep...");
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [resultImageFile, setResultImageFile] = useState<File | null>(null);
  const [resultImagePreview, setResultImagePreview] = useState<string | null>(null);
  const [removeResultImage, setRemoveResultImage] = useState(false);
  const [saveToast, setSaveToast] = useState<SaveToast | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([getRecipe(id), getRecipes()]).then(([current, all]) => {
      setRecipe(current);
      setCategories(all.flatMap((item) => item.categories));
      if (!current) return setStatus("Resep tidak ditemukan.");
      setTitle(current.title);
      setCategory(current.categories[0] ?? "");
      setIngredients(lines(current.ingredients_list));
      setInstructions(lines(current.instructions_list));
      setResultImageFile(null);
      setResultImagePreview(null);
      setRemoveResultImage(false);
      setStatus("");
    }).catch(() => setStatus("Resep belum dapat dimuat."));
  }, [id]);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  function tampilkanToast(message: string, tone: SaveToast["tone"]) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSaveToast({ message, tone });
    toastTimerRef.current = setTimeout(() => { setSaveToast(null); toastTimerRef.current = null; }, 5_000);
  }
  function pilihFotoHasil(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResultImageFile(file);
    setResultImagePreview(URL.createObjectURL(file));
    setRemoveResultImage(false);
    setStatus("");
  }
  function hapusFotoHasil() {
    setResultImageFile(null);
    setResultImagePreview(null);
    setRemoveResultImage(true);
    setStatus("");
  }
  async function save() {
    if (!recipe || !title.trim()) return tampilkanToast("Judul resep wajib diisi.", "error");
    if (isSaving) return;
    const hasResultImageChange = Boolean(resultImageFile) || removeResultImage;
    let uploadedImageUrl: string | null = null;
    setIsSaving(true);
    try {
      let resultImageUrl = recipe.result_image_url;
      if (resultImageFile) {
        tampilkanToast("Mengunggah foto hasil masakan...", "loading");
        resultImageUrl = await uploadRecipeImage(resultImageFile, "hasil-masakan");
        uploadedImageUrl = resultImageUrl;
      } else if (removeResultImage) resultImageUrl = null;

      tampilkanToast("Menyimpan perubahan...", "loading");
      const updated = await updateRecipe(recipe.id, {
        title: title.trim(),
        categories: category ? [category] : [],
        ingredients_list: toList(ingredients),
        instructions_list: toList(instructions),
        ...(hasResultImageChange ? { result_image_url: resultImageUrl } : {}),
      });
      if (recipe.result_image_url && hasResultImageChange && recipe.result_image_url !== resultImageUrl) {
        try { await deleteRecipeImage(recipe.result_image_url); } catch { /* File lama mungkin bukan berkas Storage. */ }
      }
      setRecipe(updated);
      setTitle(updated.title);
      setCategory(updated.categories[0] ?? "");
      setIngredients(lines(updated.ingredients_list));
      setInstructions(lines(updated.instructions_list));
      setResultImageFile(null);
      setResultImagePreview(null);
      setRemoveResultImage(false);
      setEdit(false);
      tampilkanToast("Perubahan berhasil disimpan.", "success");
    } catch (error) {
      if (uploadedImageUrl) {
        try { await deleteRecipeImage(uploadedImageUrl); } catch { /* File yatim tidak menghalangi pesan kesalahan utama. */ }
      }
      tampilkanToast(`Gagal menyimpan: ${pesanKegagalan(error)}`, "error");
    } finally { setIsSaving(false); }
  }
  async function toggleTried() {
    if (!recipe) return;
    setStatus("Menyimpan status resep...");
    try {
      const updated = await updateRecipe(recipe.id, { is_tried: !recipe.is_tried });
      setRecipe(updated);
      setStatus(updated.is_tried ? "Resep ditandai sebagai favorit." : "Tanda favorit dibatalkan.");
    } catch { setStatus("Status resep belum dapat disimpan."); }
  }
  async function remove() {
    if (!recipe || !window.confirm(`Hapus resep “${recipe.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setStatus("Menghapus resep...");
    try { await deleteRecipe(recipe.id); router.push("/"); } catch { setStatus("Resep belum dapat dihapus."); }
  }

  if (!recipe) return <main className="grid min-h-screen place-items-center bg-[#fffaf5] p-6"><div className="text-center"><p className="text-stone-600">{status}</p><Link href="/" className="mt-4 inline-block font-semibold text-orange-700">{t("backToCollection")}</Link></div></main>;
  const primaryCoverImage = recipe.result_image_url || recipe.cover_image_url;

  return <main className="min-h-screen bg-[#fffaf5]">
    <header className="app-navigation sticky top-0 z-10 border-b border-orange-100 bg-[#fffaf5]/95 px-4 py-4 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-base font-bold text-stone-700"><ArrowLeft className="h-8 w-8 md:h-4 md:w-4"/><span className="hidden md:inline">{t("backToCollection")}</span></Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden lg:flex" />
          {!edit && <button onClick={toggleTried} className={`hidden rounded-xl px-4 py-2 text-base font-bold sm:inline-block ${recipe.is_tried ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-800"}`}>{recipe.is_tried ? <><RotateCcw className="mr-1.5 inline" size={16}/>{t("unfavoriteRecipe")}</> : <><CheckCircle2 className="mr-1.5 inline" size={16}/>{t("favoriteRecipe")}</>}</button>}
          <button onClick={() => window.print()} aria-label={t("printRecipe")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white text-base font-bold text-stone-800 md:w-auto md:px-4"><Printer className="md:mr-1.5" size={19}/><span className="hidden md:inline">{t("printRecipe")}</span></button>
          {!edit ? <button onClick={() => { setEdit(true); setResultImageFile(null); setResultImagePreview(null); setRemoveResultImage(false); setStatus(""); }} aria-label={t("editRecipe")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-base font-bold text-white md:w-auto md:px-4"><Pencil className="md:mr-1.5" size={19}/><span className="hidden md:inline">{t("editRecipe")}</span></button> : <button onClick={save} disabled={isSaving} aria-label={t("saveChanges")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-base font-bold text-white disabled:cursor-wait disabled:opacity-60 md:w-auto md:px-4"><Save className="md:mr-1.5" size={19}/><span className="hidden md:inline">{t("saveChanges")}</span></button>}
          <button onClick={remove} aria-label={t("deleteRecipe")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700"><Trash2 size={18}/></button>
        </div>
      </div>
    </header>
    {primaryCoverImage ? <img src={primaryCoverImage} alt={`Foto ${recipe.title}`} onError={gunakanPlaceholder} className="recipe-cover h-auto max-h-[560px] w-full object-cover"/> : <div className="recipe-cover grid h-64 place-items-center bg-orange-100 text-orange-500"><Soup size={50}/></div>}
    <article className="recipe-print mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="recipe-content grid gap-10 lg:grid-cols-[1.4fr_.6fr]">
        <div className="recipe-primary">
          <div className="recipe-title mb-3 flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-orange-700">{tampilkanKategori(recipe.categories[0] || t("uncategorized"))}</p>{recipe.is_tried && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="mr-1 inline" size={13}/>{t("favoriteBadge")}</span>}<button onClick={toggleTried} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 sm:hidden">{recipe.is_tried ? t("unfavoriteRecipe") : t("favoriteRecipe")}</button></div>
          {edit ? <><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("recipeTitle")} className="w-full border-b-2 border-orange-300 bg-transparent pb-2 text-3xl font-black outline-none"/><div className="mt-4 max-w-sm"><CategoryCombobox value={category} onChange={setCategory} categories={categories}/></div></> : <h1 className="recipe-heading text-4xl font-black tracking-tight text-stone-950">{recipe.title}</h1>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-base text-stone-500"><p>{t("dateAdded")} {formatTanggalIndonesia(recipe.created_at)}</p><p>{t("source")} {sumberResep(recipe.source_url)}</p></div>
          {status && <p role="status" className="recipe-status mt-4 text-base text-stone-600"><Check className="mr-1 inline text-green-600" size={16}/>{status}</p>}
          {recipe.source_url && <div className="recipe-mobile-video mt-6 lg:hidden"><a href={recipe.source_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-lg font-bold text-white hover:bg-red-700"><ExternalLink size={20}/>{t("watchOriginal")}</a></div>}
          <section className="recipe-ingredients mt-10"><h2 className="text-xl font-black text-stone-900">{t("ingredients")}</h2>{edit ? <textarea value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder={t("oneIngredient")} rows={Math.max(5, ingredients.split("\n").length + 1)} className="mt-3 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-orange-400"/> : <ul className="mt-4 space-y-3">{recipe.ingredients_list.length ? recipe.ingredients_list.map((item, index) => <li key={index} className="flex gap-3 text-stone-700"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500"/>{item}</li>) : <li className="text-stone-500">{t("noIngredients")}</li>}</ul>}</section>
          <section className="recipe-instructions mt-10"><h2 className="text-xl font-black text-stone-900">{t("instructions")}</h2>{edit ? <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={t("oneStep")} rows={Math.max(5, instructions.split("\n").length + 1)} className="mt-3 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-orange-400"/> : <ol className="mt-4 space-y-5">{recipe.instructions_list.length ? recipe.instructions_list.map((item, index) => <li key={index} className="flex gap-4 text-stone-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">{index + 1}</span><span className="pt-1">{item}</span></li>) : <li className="text-stone-500">{t("noInstructions")}</li>}</ol>}</section>
          <section className="recipe-result-image mt-10"><h2 className="text-xl font-black text-stone-900">{t("resultPhoto")}</h2>{edit ? <div className="mt-4"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-4 text-sm font-bold text-orange-800"><ImageUp size={19}/>{t("uploadResultPhoto")}<input type="file" accept="image/*" onChange={pilihFotoHasil} className="hidden"/></label>{(resultImagePreview || (!removeResultImage && recipe.result_image_url)) && <div className="mt-4"><img src={resultImagePreview ?? recipe.result_image_url ?? ""} alt={`${t("resultPhoto")} ${recipe.title}`} onError={gunakanPlaceholder} className="h-auto w-full rounded-2xl bg-white shadow-sm"/><button type="button" onClick={hapusFotoHasil} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700"><Trash2 size={17}/>{t("removePhoto")}</button></div>}</div> : recipe.result_image_url ? <img src={recipe.result_image_url} alt={`${t("resultPhoto")} ${recipe.title}`} onError={gunakanPlaceholder} className="mt-4 h-auto w-full rounded-2xl bg-white shadow-sm"/> : <p className="mt-2 text-base text-stone-500">{t("noResultPhoto")}</p>}</section>
          {recipe.source_image_url && <section className="recipe-source-image mt-10"><h2 className="text-xl font-black text-stone-900">{t("originalPhoto")}</h2><p className="mt-2 text-sm text-stone-600">{t("originalPhotoHint")}</p><img src={recipe.source_image_url} alt={`${t("originalPhoto")} ${recipe.title}`} onError={gunakanPlaceholder} className="mt-4 h-auto w-full rounded-2xl bg-white shadow-sm"/></section>}
        </div>
        <aside className="recipe-aside hidden lg:block lg:pt-12">{recipe.source_url ? <a href={recipe.source_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-lg font-bold text-white hover:bg-red-700"><ExternalLink size={20}/>{t("watchOriginal")}</a> : <div className="rounded-xl bg-stone-100 p-4 text-base text-stone-600">{t("noOriginalVideo")}</div>}{recipe.extracted_text && <div className="mt-5 rounded-2xl border border-orange-100 bg-white p-5"><p className="text-sm font-bold tracking-wider text-orange-700">{t("extractionNote")}</p><p className="mt-2 text-base leading-6 text-stone-600">{recipe.extracted_text}</p></div>}</aside>
      </div>
    </article>
    {saveToast && <div role="status" aria-live="polite" className={`fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md rounded-2xl px-5 py-4 text-base font-bold text-white shadow-xl ${saveToast.tone === "success" ? "bg-emerald-600" : saveToast.tone === "error" ? "bg-red-600" : "bg-stone-900"}`}>{saveToast.message}</div>}
  </main>;
}
