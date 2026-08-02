import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const bucket = "recipe-images";
const maxImageBytes = 3_500_000;
const allowedFolders = new Set(["foto-resep", "hasil-masakan"]);

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Unggahan server belum dikonfigurasi. Tambahkan SUPABASE_SERVICE_ROLE_KEY di Vercel atau aktifkan kebijakan INSERT bucket recipe-images." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const requestedFolder = formData.get("folder");
    const folder = typeof requestedFolder === "string" && allowedFolders.has(requestedFolder) ? requestedFolder : "foto-resep";

    if (!image || typeof image === "string" || !image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Berkas yang dipilih harus berupa foto." }, { status: 400 });
    }
    if (image.size > maxImageBytes) {
      return NextResponse.json({ error: "Foto terlalu besar. Gunakan foto berukuran maksimal 3,5 MB." }, { status: 413 });
    }

    const extension = image.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const bytes = new Uint8Array(await image.arrayBuffer());
    const { error } = await client.storage.from(bucket).upload(path, bytes, { contentType: image.type || "image/jpeg", upsert: false });
    if (error) throw error;

    const url = client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    if (!url) throw new Error("URL publik foto tidak dapat dibuat.");
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Gagal mengunggah foto resep:", error);
    const message = error instanceof Error ? error.message : "Foto belum dapat diunggah.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
