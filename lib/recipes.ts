import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const recipeImageBucket = "recipe-images";
const maxServerUploadBytes = 3_500_000;

export type Recipe = {
  id: string;
  title: string;
  source_url: string | null;
  cover_image_url: string | null;
  source_image_url: string | null;
  result_image_url: string | null;
  extracted_text: string | null;
  ingredients_list: string[];
  instructions_list: string[];
  categories: string[];
  is_tried: boolean;
  created_at: string;
};

export type RecipeInput = Omit<Recipe, "id" | "created_at" | "is_tried" | "result_image_url"> & { is_tried?: boolean; result_image_url?: string | null };
const localKey = "koleksi-resep-lokal";
const contoh: Recipe = { id: "contoh-soto", title: "Soto Ayam Hangat", source_url: null, cover_image_url: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=900&q=80", source_image_url: null, result_image_url: null, extracted_text: "Catatan resep contoh.", ingredients_list: ["500 g ayam", "1 liter air", "Bumbu soto"], instructions_list: ["Rebus ayam hingga matang.", "Masukkan bumbu dan masak hingga harum.", "Sajikan dengan pelengkap."], categories: ["Makanan Indonesia"], is_tried: false, created_at: "2026-07-12T00:00:00.000Z" };

function normaliseRecipe(recipe: Recipe) {
  return { ...recipe, source_image_url: recipe.source_image_url ?? null, result_image_url: recipe.result_image_url ?? null, is_tried: Boolean(recipe.is_tried) };
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
    const recipe: Recipe = { ...input, result_image_url: input.result_image_url ?? null, is_tried: input.is_tried ?? false, id: crypto.randomUUID(), created_at: new Date().toISOString() };
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
    const updated = recipes.find((recipe) => recipe.id === id);
    if (!updated) throw new Error("Resep tidak ditemukan.");
    return updated;
  }
  const { data, error } = await createSupabaseClient().from("recipes").update(input).eq("id", id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Resep tidak ditemukan atau Anda tidak memiliki izin untuk memperbaruinya.");
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

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Penyimpanan foto tidak dapat dihubungi.";
}

async function uploadImageViaServer(file: File, folder: string) {
  if (file.size > maxServerUploadBytes) throw new Error("Foto terlalu besar untuk unggahan cadangan. Gunakan foto berukuran maksimal 3,5 MB atau aktifkan kebijakan unggah bucket.");
  const formData = new FormData();
  formData.set("image", file);
  formData.set("folder", folder);
  const response = await fetch("/api/upload-recipe-image", { method: "POST", body: formData });
  const payload = await response.json().catch(() => null) as { url?: unknown; error?: unknown } | null;
  if (!response.ok || typeof payload?.url !== "string") throw new Error(typeof payload?.error === "string" ? payload.error : "Unggahan foto melalui server gagal.");
  return payload.url;
}

export async function uploadRecipeImage(file: File, folder = "foto-resep") {
  if (!file.type.startsWith("image/")) throw new Error("Berkas yang dipilih harus berupa foto.");
  if (!isSupabaseConfigured()) return readFileAsDataUrl(file);

  // Bucket `recipe-images` must be public and allow INSERT/SELECT (and DELETE for removal)
  // on `storage.objects` for this browser role. Run supabase/schema.sql in the Supabase SQL
  // Editor, or update the bucket's RLS policies, before using uploads in production.
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const client = createSupabaseClient();
  try {
    const { error } = await client.storage.from(recipeImageBucket).upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw error;
    const publicUrl = client.storage.from(recipeImageBucket).getPublicUrl(path).data.publicUrl;
    if (!publicUrl) throw new Error("URL publik foto tidak dapat dibuat.");
    return publicUrl;
  } catch (browserUploadError) {
    // Cadangan server memakai service-role key, sehingga tetap bekerja bila RLS browser
    // belum diterapkan. Endpoint ini tidak pernah mengirim kunci tersebut ke klien.
    try {
      return await uploadImageViaServer(file, folder);
    } catch (serverUploadError) {
      throw new Error(`Foto gagal diunggah. ${errorMessage(browserUploadError)} ${errorMessage(serverUploadError)}`);
    }
  }
}

export async function deleteRecipeImage(url: string | null) {
  if (!url || !isSupabaseConfigured()) return;
  const prefix = "/storage/v1/object/public/recipe-images/";
  const pathIndex = url.indexOf(prefix);
  if (pathIndex === -1) return;
  const path = decodeURIComponent(url.slice(pathIndex + prefix.length));
  const { error } = await createSupabaseClient().storage.from(recipeImageBucket).remove([path]);
  if (error) throw error;
}
