import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 2_800_000;
const prompt = `You are an expert culinary AI and a native Indonesian speaker. Read the handwritten Indonesian recipe in this image. CRUCIAL: The handwriting will contain common Indonesian abbreviations (e.g., 'baput', 'bamer', 'sdm', 'sdt', 'yg', 'dgn') and symbols (e.g., '+', '->', fractions, or '@'). It will also frequently use the ditto mark symbol (") to indicate 'same as above' (e.g., if line 1 is '1 sdm gula' and line 2 is '2 " garam', line 2 translates to '2 sdm garam'). You must decode, contextualize, and expand these shortened words, ditto marks, and symbols into proper, complete Indonesian words based on the cooking context. Extract the text and structure it into two distinct sections: 'Bahan-bahan' (Ingredients) and 'Cara Membuat' (Step-by-step instructions). Output the result in clean JSON format with separate arrays/fields for 'bahan' and 'cara_membuat'.`;

function asList(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function parseImage(image: unknown) {
  if (typeof image !== "string") throw new Error("Foto resep belum dikirim.");
  const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Format foto tidak didukung. Gunakan foto JPEG, PNG, atau WebP.");
  const data = match[2];
  const bytes = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) throw new Error("Foto terlalu besar untuk dianalisis. Gunakan foto yang lebih kecil.");
  return { mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1], data };
}

function parseRecipe(rawResponse: string) {
  const cleaned = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const entries = Object.entries(parsed).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value] as const);
    const bahan = asList(entries.find(([key]) => key.includes("bahan") || key.includes("ingredient"))?.[1]);
    const cara_membuat = asList(entries.find(([key]) => key.includes("caramembuat") || key.includes("langkah") || key.includes("instruction") || key.includes("step"))?.[1]);
    if (bahan.length || cara_membuat.length) return { bahan, cara_membuat };
  } catch { /* Gemini diminta JSON, tetapi tetap beri pesan yang ramah jika respons tidak valid. */ }
  throw new Error("Tulisan tangan belum dapat disusun sebagai resep. Silakan lengkapi secara manual.");
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json() as { image?: string };
    const imageData = parseImage(image);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Kunci Gemini belum diatur. Tambahkan GEMINI_API_KEY untuk membaca foto resep." }, { status: 503 });

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,
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
      { inlineData: imageData },
      { text: prompt },
    ]);
    return NextResponse.json(parseRecipe(result.response.text()));
  } catch (error) {
    console.error("Gagal menganalisis foto resep:", error);
    const message = error instanceof Error ? error.message : "Foto resep tidak dapat dianalisis.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
