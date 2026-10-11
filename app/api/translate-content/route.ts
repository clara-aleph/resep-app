import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { translate } from "@vitalets/google-translate-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const targetLanguages = {
  en: "en",
  nl: "nl",
  zh: "zh-CN",
  ja: "ja",
} as const;

type TargetLocale = keyof typeof targetLanguages;
type RecipeContent = { id: string; title: string; ingredients: string[]; steps: string[] };

function sourceSignature(recipe: RecipeContent) {
  return JSON.stringify([recipe.title, recipe.ingredients, recipe.steps]);
}

function asText(value: unknown, maxLength = 2_000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function asList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asText(item)).filter(Boolean) : [];
}
function parseContent(value: unknown): RecipeContent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = asText(item.id, 200);
  const title = asText(item.title);
  const ingredients = asList(item.ingredients);
  const steps = asList(item.steps);
  if (!id || !title || ingredients.length > 80 || steps.length > 120) return null;
  return { id, title, ingredients, steps };
}

function cacheClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The cache remains server-owned: never expose its write access to browser clients.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

function normaliseCached(value: unknown, recipe: RecipeContent): RecipeContent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  // Cache entries written before this marker existed may contain the original Indonesian
  // content. Treat them as stale and regenerate them rather than returning a false hit.
  if (item.source_signature !== sourceSignature(recipe)) return null;
  const title = asText(item.title);
  const ingredients = asList(item.ingredients);
  const steps = asList(item.steps);
  return title ? { id: recipe.id, title, ingredients, steps } : null;
}

async function translateRecipe(recipe: RecipeContent, locale: TargetLocale): Promise<RecipeContent> {
  const to = targetLanguages[locale];
  // Newlines retain the ingredient and instruction boundaries without asking an AI model
  // to interpret, alter, or restructure the Indonesian recipe data.
  const [title, ingredients, steps] = await Promise.all([
    translate(recipe.title, { from: "id", to }),
    recipe.ingredients.length ? translate(recipe.ingredients.join("\n"), { from: "id", to }) : Promise.resolve({ text: "" }),
    recipe.steps.length ? translate(recipe.steps.join("\n"), { from: "id", to }) : Promise.resolve({ text: "" }),
  ]);
  const translated = {
    id: recipe.id,
    title: title.text.trim() || recipe.title,
    ingredients: ingredients.text ? ingredients.text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [],
    steps: steps.text ? steps.text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [],
  };
  // Retry automatic language detection if Google did not transform any text despite a
  // requested foreign locale. This prevents an Indonesian cache entry from persisting.
  if (sourceSignature(translated) === sourceSignature(recipe)) {
    const [retryTitle, retryIngredients, retrySteps] = await Promise.all([
      translate(recipe.title, { from: "auto", to }),
      recipe.ingredients.length ? translate(recipe.ingredients.join("\n"), { from: "auto", to }) : Promise.resolve({ text: "" }),
      recipe.steps.length ? translate(recipe.steps.join("\n"), { from: "auto", to }) : Promise.resolve({ text: "" }),
    ]);
    return {
      id: recipe.id,
      title: retryTitle.text.trim() || recipe.title,
      ingredients: retryIngredients.text ? retryIngredients.text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [],
      steps: retrySteps.text ? retrySteps.text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) : [],
    };
  }
  return translated;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { locale?: unknown; recipes?: unknown };
    const locale = body.locale;
    if (typeof locale !== "string" || !(locale in targetLanguages)) return NextResponse.json({ error: "Bahasa terjemahan tidak didukung." }, { status: 400 });
    const recipes = Array.isArray(body.recipes) ? body.recipes.map(parseContent).filter((item): item is RecipeContent => Boolean(item)) : [];
    if (!recipes.length || recipes.length > 12) return NextResponse.json({ error: "Kirim 1 hingga 12 resep untuk diterjemahkan." }, { status: 400 });

    const client = cacheClient();
    const cached = new Map<string, RecipeContent>();
    if (client) {
      const { data, error } = await client.from("recipe_translations").select("recipe_id, content").eq("locale", locale).in("recipe_id", recipes.map((recipe) => recipe.id));
      // A missing migration must not block display translation; it simply skips cache use.
      if (error) console.warn("Cache terjemahan belum tersedia:", error.message);
      else for (const row of data ?? []) {
        const recipe = recipes.find((item) => item.id === row.recipe_id);
        const content = recipe ? normaliseCached(row.content, recipe) : null;
        if (content) cached.set(row.recipe_id, content);
      }
    }

    const translated = await Promise.all(recipes.map(async (recipe) => {
      const saved = cached.get(recipe.id);
      if (saved) return saved;
      const content = await translateRecipe(recipe, locale as TargetLocale);
      if (client) {
        const { error } = await client.from("recipe_translations").upsert({
          recipe_id: recipe.id,
          locale,
          content: { title: content.title, ingredients: content.ingredients, steps: content.steps, source_signature: sourceSignature(recipe) },
          updated_at: new Date().toISOString(),
        }, { onConflict: "recipe_id,locale" });
        if (error) console.warn("Terjemahan dibuat, tetapi belum dapat dicache:", error.message);
      }
      return content;
    }));
    return NextResponse.json({ recipes: translated });
  } catch (error) {
    console.error("Gagal menerjemahkan tampilan resep:", error);
    const message = error instanceof Error ? error.message : "Terjemahan resep belum dapat dibuat.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
