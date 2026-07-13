import { NextRequest, NextResponse } from "next/server";

function providerFor(url: URL) {
  const host = url.hostname.replace("www.", "").toLowerCase();
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;
  }
  if (host === "facebook.com" || host === "fb.watch") {
    return `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url.toString())}`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "Tautan belum diisi." }, { status: 400 });

  try {
    const url = new URL(rawUrl);
    const endpoint = providerFor(url);
    if (!endpoint) return NextResponse.json({ error: "Gunakan tautan YouTube atau Facebook." }, { status: 400 });

    const response = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("oEmbed tidak tersedia");
    const data = await response.json();
    return NextResponse.json({ title: data.title ?? "Resep video", thumbnail_url: data.thumbnail_url ?? null });
  } catch {
    return NextResponse.json({ error: "Thumbnail tidak dapat diambil. Periksa tautan atau privasi videonya." }, { status: 422 });
  }
}
