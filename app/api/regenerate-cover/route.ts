import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { storeCoverImage } from "@/lib/cover-storage";
import { getPermanentCoverSource } from "@/lib/video-thumbnail";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Penyimpanan sampul belum dikonfigurasi." }, { status: 503 });

  try {
    const { recipeId, sourceUrl } = await request.json() as { recipeId?: unknown; sourceUrl?: unknown };
    if (typeof recipeId !== "string" || typeof sourceUrl !== "string") return NextResponse.json({ error: "Resep atau tautan sumber tidak valid." }, { status: 400 });
    const source = new URL(sourceUrl);
    if (source.protocol !== "https:") return NextResponse.json({ error: "Tautan sumber harus menggunakan HTTPS." }, { status: 400 });

    const extracted = await getPermanentCoverSource(sourceUrl);
    const coverUrl = await storeCoverImage(extracted.imageUrl);
    if (!coverUrl) return NextResponse.json({ error: "Thumbnail baru belum dapat disimpan secara permanen." }, { status: 422 });

    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await client.from("recipes").update({
      cover_image_url: coverUrl,
      original_cover_image_url: coverUrl,
    }).eq("id", recipeId).select().single();
    if (error) throw error;
    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Gagal membuat ulang sampul resep:", error);
    const message = error instanceof Error ? error.message : "Sampul belum dapat dibuat ulang.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
