"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "id" | "en" | "zh" | "nl" | "ja";

const indonesian = {
  appName: "Koleksi Resepku",
  createdBy: "Created by: Clara Wijaya",
  language: "Bahasa",
  savedRecipes: "Resep tersimpan",
  recipes: "resep",
  searchRecipes: "Cari bahan atau resep",
  clearSearch: "Hapus pencarian",
  reset: "Reset",
  favoriteRecipes: "Resep Favorit ❤️",
  allCategories: "Semua Kategori",
  allSources: "Semua Sumber",
  video: "Video",
  manualPhoto: "Manual/Foto",
  noRecipes: "Belum ada resep yang cocok.",
  noRecipesHint: "Coba kata kunci lain atau ubah filter.",
  uncategorized: "Tanpa kategori",
  ingredients: "Bahan-bahan",
  steps: "Langkah-langkah",
  backToTop: "Kembali ke atas",
  addRecipe: "Tambah Resep",
  saveVideoLink: "Simpan Tautan Video",
  uploadRecipePhoto: "Unggah Foto Resep",
  analyzeVideo: "Analisis Video",
  videoPlaceholder: "Tempelkan tautan video resep...",
  chooseRecipePhoto: "Pilih foto catatan resep",
  recipeTitle: "Judul resep",
  titlePlaceholder: "Contoh: Sayur Labu Santan",
  category: "Kategori",
  categoryPlaceholder: "Ketik atau pilih kategori...",
  noMatchingCategory: "Tidak ada kategori yang sama.",
  createCategory: "Buat kategori",
  oneIngredient: "Satu bahan per baris",
  oneStep: "Satu langkah per baris",
  saveRecipe: "Simpan Resep",
  backToCollection: "Kembali ke koleksi",
  printRecipe: "Cetak Resep",
  editRecipe: "Edit Resep",
  saveChanges: "Simpan Perubahan",
  deleteRecipe: "Hapus resep",
  favoriteRecipe: "Favoritkan Resep Ini ❤️",
  unfavoriteRecipe: "Batalkan favorit",
  favoriteBadge: "Resep Favorit ❤️",
  dateAdded: "Ditambahkan pada:",
  source: "Sumber:",
  watchOriginal: "Tonton Video Asli",
  noOriginalVideo: "Tidak ada tautan video asli untuk resep ini.",
  instructions: "Cara Membuat",
  noIngredients: "Bahan belum ditambahkan.",
  noInstructions: "Langkah belum ditambahkan.",
  resultPhoto: "Hasil masakan",
  uploadResultPhoto: "Unggah foto hasil masakan",
  removePhoto: "Hapus Foto",
  noResultPhoto: "Belum ada foto hasil masakan.",
  originalPhoto: "Foto resep asli",
  originalPhotoHint: "Foto ditampilkan utuh sesuai proporsi unggahan.",
  extractionNote: "CATATAN EKSTRAKSI",
} as const;

type TranslationKey = keyof typeof indonesian;
type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  id: indonesian,
  en: {
    appName: "My Recipe Collection", createdBy: "Created by: Clara Wijaya", language: "Language", savedRecipes: "Saved recipes", recipes: "recipes", searchRecipes: "Search ingredients or recipes", clearSearch: "Clear search", reset: "Reset", favoriteRecipes: "Favorite Recipes ❤️", allCategories: "All Categories", allSources: "All Sources", video: "Video", manualPhoto: "Manual/Photo", noRecipes: "No matching recipes yet.", noRecipesHint: "Try another keyword or change the filters.", uncategorized: "Uncategorized", ingredients: "Ingredients", steps: "Steps", backToTop: "Back to top", addRecipe: "Add Recipe", saveVideoLink: "Save Video Link", uploadRecipePhoto: "Upload Recipe Photo", analyzeVideo: "Analyze Video", videoPlaceholder: "Paste a recipe video link...", chooseRecipePhoto: "Choose a recipe note photo", recipeTitle: "Recipe title", titlePlaceholder: "Example: Creamy Chayote Curry", category: "Category", categoryPlaceholder: "Type or choose a category...", noMatchingCategory: "No matching category.", createCategory: "Create category", oneIngredient: "One ingredient per line", oneStep: "One step per line", saveRecipe: "Save Recipe", backToCollection: "Back to collection", printRecipe: "Print Recipe", editRecipe: "Edit Recipe", saveChanges: "Save Changes", deleteRecipe: "Delete recipe", favoriteRecipe: "Add to Favorites ❤️", unfavoriteRecipe: "Remove from favorites", favoriteBadge: "Favorite Recipe ❤️", dateAdded: "Added on:", source: "Source:", watchOriginal: "Watch Original Video", noOriginalVideo: "No original video link for this recipe.", instructions: "Instructions", noIngredients: "Ingredients have not been added.", noInstructions: "Steps have not been added.", resultPhoto: "Cooking result", uploadResultPhoto: "Upload cooking result photo", removePhoto: "Remove Photo", noResultPhoto: "No cooking result photo yet.", originalPhoto: "Original recipe photo", originalPhotoHint: "The photo is shown in its original upload proportions.", extractionNote: "EXTRACTION NOTES",
  },
  zh: {
    appName: "我的食谱收藏", createdBy: "Created by: Clara Wijaya", language: "语言", savedRecipes: "已保存的食谱", recipes: "个食谱", searchRecipes: "搜索食材或食谱", clearSearch: "清除搜索", reset: "重置", favoriteRecipes: "收藏食谱 ❤️", allCategories: "所有类别", allSources: "所有来源", video: "视频", manualPhoto: "手动/照片", noRecipes: "暂无匹配的食谱。", noRecipesHint: "请尝试其他关键词或更改筛选条件。", uncategorized: "未分类", ingredients: "食材", steps: "步骤", backToTop: "返回顶部", addRecipe: "添加食谱", saveVideoLink: "保存视频链接", uploadRecipePhoto: "上传食谱照片", analyzeVideo: "分析视频", videoPlaceholder: "粘贴食谱视频链接...", chooseRecipePhoto: "选择食谱笔记照片", recipeTitle: "食谱名称", titlePlaceholder: "例如：奶油佛手瓜咖喱", category: "类别", categoryPlaceholder: "输入或选择类别...", noMatchingCategory: "没有匹配的类别。", createCategory: "创建类别", oneIngredient: "每行一种食材", oneStep: "每行一个步骤", saveRecipe: "保存食谱", backToCollection: "返回收藏", printRecipe: "打印食谱", editRecipe: "编辑食谱", saveChanges: "保存更改", deleteRecipe: "删除食谱", favoriteRecipe: "收藏此食谱 ❤️", unfavoriteRecipe: "取消收藏", favoriteBadge: "收藏食谱 ❤️", dateAdded: "添加日期：", source: "来源：", watchOriginal: "观看原始视频", noOriginalVideo: "此食谱没有原始视频链接。", instructions: "制作方法", noIngredients: "尚未添加食材。", noInstructions: "尚未添加步骤。", resultPhoto: "成品照片", uploadResultPhoto: "上传成品照片", removePhoto: "删除照片", noResultPhoto: "暂无成品照片。", originalPhoto: "原始食谱照片", originalPhotoHint: "照片将按原始上传比例显示。", extractionNote: "提取备注",
  },
  nl: {
    appName: "Mijn Receptencollectie", createdBy: "Created by: Clara Wijaya", language: "Taal", savedRecipes: "Opgeslagen recepten", recipes: "recepten", searchRecipes: "Zoek ingrediënten of recepten", clearSearch: "Zoekopdracht wissen", reset: "Resetten", favoriteRecipes: "Favoriete Recepten ❤️", allCategories: "Alle Categorieën", allSources: "Alle Bronnen", video: "Video", manualPhoto: "Handmatig/Foto", noRecipes: "Nog geen passende recepten.", noRecipesHint: "Probeer een ander zoekwoord of pas de filters aan.", uncategorized: "Geen categorie", ingredients: "Ingrediënten", steps: "Stappen", backToTop: "Terug naar boven", addRecipe: "Recept Toevoegen", saveVideoLink: "Videolink Opslaan", uploadRecipePhoto: "Receptfoto Uploaden", analyzeVideo: "Video Analyseren", videoPlaceholder: "Plak een link naar een receptvideo...", chooseRecipePhoto: "Kies een foto van receptnotities", recipeTitle: "Recepttitel", titlePlaceholder: "Voorbeeld: Romige Labu Siam Curry", category: "Categorie", categoryPlaceholder: "Typ of kies een categorie...", noMatchingCategory: "Geen overeenkomende categorie.", createCategory: "Categorie maken", oneIngredient: "Eén ingrediënt per regel", oneStep: "Eén stap per regel", saveRecipe: "Recept Opslaan", backToCollection: "Terug naar collectie", printRecipe: "Recept Afdrukken", editRecipe: "Recept Bewerken", saveChanges: "Wijzigingen Opslaan", deleteRecipe: "Recept verwijderen", favoriteRecipe: "Als Favoriet Markeren ❤️", unfavoriteRecipe: "Favoriet verwijderen", favoriteBadge: "Favoriet Recept ❤️", dateAdded: "Toegevoegd op:", source: "Bron:", watchOriginal: "Originele Video Bekijken", noOriginalVideo: "Geen originele videolink voor dit recept.", instructions: "Bereidingswijze", noIngredients: "Ingrediënten zijn nog niet toegevoegd.", noInstructions: "Stappen zijn nog niet toegevoegd.", resultPhoto: "Kookresultaat", uploadResultPhoto: "Foto van kookresultaat uploaden", removePhoto: "Foto Verwijderen", noResultPhoto: "Nog geen foto van het kookresultaat.", originalPhoto: "Originele receptfoto", originalPhotoHint: "De foto wordt in de oorspronkelijke verhouding getoond.", extractionNote: "EXTRACTIENOTITIES",
  },
  ja: {
    appName: "私のレシピ集", createdBy: "Created by: Clara Wijaya", language: "言語", savedRecipes: "保存したレシピ", recipes: "件のレシピ", searchRecipes: "材料またはレシピを検索", clearSearch: "検索をクリア", reset: "リセット", favoriteRecipes: "お気に入りのレシピ ❤️", allCategories: "すべてのカテゴリー", allSources: "すべてのソース", video: "動画", manualPhoto: "手動/写真", noRecipes: "一致するレシピはありません。", noRecipesHint: "別のキーワードを試すか、フィルターを変更してください。", uncategorized: "未分類", ingredients: "材料", steps: "手順", backToTop: "トップへ戻る", addRecipe: "レシピを追加", saveVideoLink: "動画リンクを保存", uploadRecipePhoto: "レシピ写真をアップロード", analyzeVideo: "動画を分析", videoPlaceholder: "レシピ動画のリンクを貼り付け...", chooseRecipePhoto: "レシピメモの写真を選択", recipeTitle: "レシピ名", titlePlaceholder: "例：クリーミーなハヤトウリカレー", category: "カテゴリー", categoryPlaceholder: "カテゴリーを入力または選択...", noMatchingCategory: "一致するカテゴリーはありません。", createCategory: "カテゴリーを作成", oneIngredient: "1行に1つの材料", oneStep: "1行に1つの手順", saveRecipe: "レシピを保存", backToCollection: "コレクションに戻る", printRecipe: "レシピを印刷", editRecipe: "レシピを編集", saveChanges: "変更を保存", deleteRecipe: "レシピを削除", favoriteRecipe: "このレシピをお気に入りに ❤️", unfavoriteRecipe: "お気に入りを解除", favoriteBadge: "お気に入りのレシピ ❤️", dateAdded: "追加日：", source: "ソース：", watchOriginal: "元の動画を見る", noOriginalVideo: "このレシピには元の動画リンクがありません。", instructions: "作り方", noIngredients: "材料はまだ追加されていません。", noInstructions: "手順はまだ追加されていません。", resultPhoto: "調理結果", uploadResultPhoto: "調理結果の写真をアップロード", removePhoto: "写真を削除", noResultPhoto: "調理結果の写真はまだありません。", originalPhoto: "元のレシピ写真", originalPhotoHint: "写真は元の比率で表示されます。", extractionNote: "抽出メモ",
  },
};

const localeNames: Record<Locale, string> = { id: "Indonesia", en: "English", zh: "中文", nl: "Nederlands", ja: "日本語" };

type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey) => string };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("koleksi-resep-locale") as Locale | null;
    if (savedLocale && savedLocale in dictionaries) setLocaleState(savedLocale);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: (nextLocale) => {
      setLocaleState(nextLocale);
      window.localStorage.setItem("koleksi-resep-locale", nextLocale);
    },
    t: (key) => dictionaries[locale][key],
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n harus digunakan di dalam I18nProvider.");
  return value;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return <label className={`flex items-center gap-2 text-sm font-semibold text-stone-600 ${className}`}>
    <span className="sr-only">{t("language")}</span>
    <select aria-label={t("language")} value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-orange-400">
      {(Object.keys(localeNames) as Locale[]).map((code) => <option key={code} value={code}>{localeNames[code]}</option>)}
    </select>
  </label>;
}
