import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type Recipe = {
  id: string;
  title: string;
  source_url: string | null;
  cover_image_url: string | null;
  source_image_url: string | null;
  extracted_text: string | null;
  ingredients_list: string[];
  instructions_list: string[];
  categories: string[];
  is_tried: boolean;
  created_at: string;
};

export type RecipeInput = Omit<Recipe, "id" | "created_at" | "is_tried"> & { is_tried?: boolean };
const localKey = "koleksi-resep-lokal";
const contoh: Recipe = { id: "contoh-soto", title: "Soto Ayam Hangat", source_url: null, cover_image_url: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=80", source_image_url: null, extracted_text: "Catatan resep contoh.", ingredients_list: ["500 g ayam", "1 liter air", "Bumbu soto"], instructions_list: ["Rebus ayam hingga matang.", "Masukkan bumbu dan masak hingga harum.", "Sajikan dengan pelengkap."], categories: ["Makanan Indonesia"], is_tried: false, created_at: "2026-07-12T00:00:00.000Z" };

function normaliseRecipe(recipe: Recipe) {
  return { ...recipe, source_image_url: recipe.source_image_url ?? null, is_tried: Boolean(recipe.is_tried) };
}

function localRecipes() {
  if (typeof window === "undefined") return [contoh];
  const saved = window.localStorage.getItem(localKey);
  return saved ? (JSON.parse(saved) as Recipe[]).map(normaliseRecipe) : [contoh];
}
function writeLocal(recipes: Recipe[]) { window.localStorage.setItem(localKey, JSON.stringify(recipes)); }

export async function getRecipes() {
  if (!isSupabaseConfigured()) return localRecipes();
  const { data, error } = await createSupabaseClient().from("recipes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Recipe[]).map(normaliseRecipe);
}
export async function getRecipe(id: string) {
  if (!isSupabaseConfigured()) return localRecipes().find((recipe) => recipe.id === id) ?? null;
  const { data, error } = await createSupabaseClient().from("recipes").select("*").eq("id", id).single();
  if (error) return null;
  return normaliseRecipe(data as Recipe);
}
export async function createRecipe(input: RecipeInput) {
  if (!isSupabaseConfigured()) {
    const recipe: Recipe = { ...input, is_tried: input.is_tried ?? false, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    writeLocal([recipe, ...localRecipes()]);
    return recipe;
  }
  const { data, error } = await createSupabaseClient().from("recipes").insert(input).select().single();
  if (error) throw error;
  return normaliseRecipe(data as Recipe);
}
export async function updateRecipe(id: string, input: Partial<RecipeInput>) {
  if (!isSupabaseConfigured()) {
    const recipes = localRecipes().map((recipe) => recipe.id === id ? { ...recipe, ...input } : recipe);
    writeLocal(recipes);
    return recipes.find((recipe) => recipe.id === id) ?? null;
  }
  const { data, error } = await createSupabaseClient().from("recipes").update(input).eq("id", id).select().single();
  if (error) throw error;
  return normaliseRecipe(data as Recipe);
}

export async function deleteRecipe(id: string) {
  if (!isSupabaseConfigured()) { writeLocal(localRecipes().filter((recipe) => recipe.id !== id)); return; }
  const { error } = await createSupabaseClient().from("recipes").delete().eq("id", id);
  if (error) throw error;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

export async function uploadRecipeImage(file: File) {
  const fallback = await readFileAsDataUrl(file);
  if (!isSupabaseConfigured()) return fallback;
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const path = `foto-resep/${crypto.randomUUID()}.${extension}`;
  const client = createSupabaseClient();
  const { error } = await client.storage.from("recipe-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return fallback;
  return client.storage.from("recipe-images").getPublicUrl(path).data.publicUrl;
}
