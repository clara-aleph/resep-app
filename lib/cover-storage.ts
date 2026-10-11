import { createClient } from "@supabase/supabase-js";

const bucket = "recipe-covers";
const maxCoverBytes = 4_000_000;

function extensionFor(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/** Downloads a remote thumbnail server-side and returns a permanent public Storage URL. */
export async function storeCoverImage(sourceUrl: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sourceUrl || !supabaseUrl || !serviceRoleKey) return null;

  try {
    const source = new URL(sourceUrl);
    if (source.protocol !== "https:") return null;
    const response = await fetch(source, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KoleksiResepku/1.0)" },
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;

    const image = new Uint8Array(await response.arrayBuffer());
    if (!image.byteLength || image.byteLength > maxCoverBytes) return null;

    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const path = `video-covers/${crypto.randomUUID()}.${extensionFor(contentType)}`;
    const { error } = await client.storage.from(bucket).upload(path, image, { contentType, upsert: false });
    if (error) throw error;
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl || null;
  } catch (error) {
    console.warn("Thumbnail eksternal tidak dapat disimpan permanen:", error);
    return null;
  }
}
