import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const targetLanguages = {
  en: "English",
  nl: "Dutch",
  zh: "Simplified Chinese",
  ja: "Japanese",
} as const;

type TargetLocale = keyof typeof targetLanguages;
type RecipeContent = { id: string; title: string; ingredients: string[]; steps: string[] };

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

function parseTranslation(rawResponse: string, originals: RecipeContent[]) {
  const cleaned = rawResponse.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  const parsed = JSON.parse(candidate) as { recipes?: unknown };
  const received = Array.isArray(parsed.recipes) ? parsed.recipes.map(parseContent).filter((item): item is RecipeContent => Boolean(item)) : [];
  const byId = new Map(received.map((item) => [item.id, item]));
  return originals.map((original) => byId.get(original.id) ?? original);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { locale?: unknown; recipes?: unknown };
    const locale = body.locale;
    if (typeof locale !== "string" || !(locale in targetLanguages)) return NextResponse.json({ error: "Bahasa terjemahan tidak didukung." }, { status: 400 });
    const recipes = Array.isArray(body.recipes) ? body.recipes.map(parseContent).filter((item): item is RecipeContent => Boolean(item)) : [];
    if (!recipes.length || recipes.length > 12) return NextResponse.json({ error: "Kirim 1 hingga 12 resep untuk diterjemahkan." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Kunci Gemini belum diatur untuk menerjemahkan tampilan resep." }, { status: 503 });
    const targetLanguage = targetLanguages[locale as TargetLocale];
    const prompt = `You are a precise culinary translator. The following recipe data is stored in Indonesian. Translate only its title, ingredients, and steps into ${targetLanguage} for temporary on-screen display. Preserve every quantity, unit, ordering, and cooking meaning. Do not invent, omit, combine, or add ingredients or steps. Do not translate the id field. Return clean JSON containing a recipes array with the exact fields id, title, ingredients, and steps. Source data: ${JSON.stringify(recipes)}`;

    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            recipes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  ingredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
                required: ["id", "title", "ingredients", "steps"],
              },
            },
          },
          required: ["recipes"],
        },
      },
    });
    const result = await model.generateContent(prompt);
    return NextResponse.json({ recipes: parseTranslation(result.response.text(), recipes) });
  } catch (error) {
    console.error("Gagal menerjemahkan tampilan resep:", error);
    const message = error instanceof Error ? error.message : "Terjemahan resep belum dapat dibuat.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
