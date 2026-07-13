import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import getFacebookVideoInfo from "@renpwn/fb-downloader";
import { instagram as getInstagramVideoInfo } from "@jerrycoder/instagram-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const prompt = "You are an elite culinary AI. Watch this cooking video and extract the full recipe. You MUST separate the content clearly into two distinct sections: 'Bahan-bahan' (Ingredients) and 'Cara Membuat' (Step-by-step instructions). Crucial Requirement: The entire output must be translated and written strictly in Indonesian, regardless of the original language spoken or shown in the video. Output the result in clean JSON format with separate arrays/fields for 'bahan' and 'cara_membuat' so the frontend can parse it easily. Hanya sertakan bahan dan langkah yang benar-benar terlihat, terdengar, atau tersirat jelas dalam video. Jika video bukan resep, kembalikan kedua array kosong.";

const mockRecipe = {
  bahan: ["500 gram ayam, potong sesuai selera", "3 siung bawang putih, haluskan", "1 sendok teh garam", "2 sendok makan minyak goreng"],
  cara_membuat: ["Panaskan minyak dalam wajan.", "Tumis bawang putih hingga harum.", "Masukkan ayam dan bumbui dengan garam.", "Masak hingga ayam matang, lalu sajikan selagi hangat."],
};

function validYoutubeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return url.protocol === "https:" && (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be");
  } catch { return false; }
}

function validFacebookUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch";
  } catch { return false; }
}

function validInstagramUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return host === "instagram.com" || host === "m.instagram.com";
  } catch { return false; }
}

function asList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((item) => item.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  return [];
}

function parseRecipe(rawResponse: string) {
  const cleaned = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const jsonObject = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  try {
    const parsed = JSON.parse(jsonObject) as Record<string, unknown>;
    const entries = Object.entries(parsed).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value] as const);
    const bahan = asList(entries.find(([key]) => key.includes("bahan") || key.includes("ingredient"))?.[1]);
    const cara_membuat = asList(entries.find(([key]) => key.includes("caramembuat") || key.includes("langkah") || key.includes("instruction") || key.includes("step"))?.[1]);
    if (bahan.length || cara_membuat.length) return { bahan, cara_membuat };
  } catch { /* Model kadang menambahkan teks; coba format bagian di bawah. */ }

  const section = (start: string, end?: string) => {
    const match = cleaned.match(new RegExp(`${start}\\s*:?[\\s\\r\\n]*([\\s\\S]*?)${end ? `(?=${end}|$)` : "$"}`, "i"));
    return asList(match?.[1]);
  };
  const bahan = section("Bahan(?:-bahan)?", "Cara Membuat|Langkah(?:-langkah)?");
  const cara_membuat = section("Cara Membuat|Langkah(?:-langkah)?");
  if (bahan.length || cara_membuat.length) return { bahan, cara_membuat };
  throw new Error("Video belum dapat dikenali sebagai resep. Gunakan video memasak YouTube yang bersifat publik.");
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url?: string };
    if (!url?.trim() || (!validYoutubeUrl(url) && !validFacebookUrl(url) && !validInstagramUrl(url))) return NextResponse.json({ error: "Gunakan tautan video YouTube, Facebook, atau Instagram publik yang valid." }, { status: 400 });

    // Memungkinkan pratinjau UI tanpa kredensial dan tanpa biaya API.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ ...mockRecipe, mock: true });

    let videoUri = url.trim();
    let mimeType = "video/*";
    let title: string | null = null;
    let thumbnailUrl: string | null = null;

    if (validFacebookUrl(url)) {
      try {
        const facebookVideo = await getFacebookVideoInfo(url.trim());
        videoUri = facebookVideo.hd || facebookVideo.sd;
        if (!videoUri) throw new Error("Tautan video langsung tidak tersedia.");
        mimeType = "video/mp4";
        title = facebookVideo.title || null;
        thumbnailUrl = facebookVideo.thumbnail || null;
      } catch (error) {
        console.warn("Video Facebook tidak dapat diakses:", error);
        return NextResponse.json({ error: "Video Facebook ini diproteksi atau privat. Silakan masukkan resep secara manual." }, { status: 422 });
      }
    }

    if (validInstagramUrl(url)) {
      try {
        const instagramVideo = await getInstagramVideoInfo(url.trim());
        const directVideoUrl = [instagramVideo.url, instagramVideo.type].find((value): value is string => typeof value === "string" && value.startsWith("https://"));
        if (!directVideoUrl) throw new Error("Tautan video langsung tidak tersedia.");
        videoUri = directVideoUrl;
        mimeType = "video/mp4";
      } catch (error) {
        console.warn("Video Instagram tidak dapat diakses:", error);
        return NextResponse.json({ error: "Video Instagram ini diproteksi. Silakan masukkan resep secara manual." }, { status: 422 });
      }
    }

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            bahan: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            cara_membuat: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["bahan", "cara_membuat"],
        },
      },
    });
    const result = await model.generateContent([
      // YouTube mempertahankan alur URI langsung; Facebook memakai URI MP4 publik dari scraper di server.
      { fileData: { mimeType, fileUri: videoUri } },
      { text: prompt },
    ]);
    return NextResponse.json({ ...parseRecipe(result.response.text()), mock: false, title, thumbnail_url: thumbnailUrl });
  } catch (error) {
    console.error("Gagal menganalisis video masak:", error);
    const message = error instanceof Error ? error.message : "Video tidak dapat dianalisis.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
