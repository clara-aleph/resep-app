"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Recipe } from "@/lib/recipes";

export type TranslatedRecipeContent = { id: string; title: string; ingredients: string[]; steps: string[] };
type TranslationMap = Record<string, TranslatedRecipeContent>;

const cache = new Map<string, TranslationMap>();
const batchSize = 12;

function requestSignature(recipes: Recipe[]) {
  return recipes.map((recipe) => [recipe.id, recipe.title, recipe.ingredients_list.join("\u0001"), recipe.instructions_list.join("\u0001")].join("\u0002")).join("\u0003");
}
function cacheKey(locale: string, signature: string) { return `${locale}:${signature}`; }

export function useRecipeTranslations(recipes: Recipe[]) {
  const { locale } = useI18n();
  const signature = useMemo(() => requestSignature(recipes), [recipes]);
  const requestRecipes = useMemo(() => recipes.map((recipe) => ({ id: recipe.id, title: recipe.title, ingredients: recipe.ingredients_list, steps: recipe.instructions_list })), [signature]);
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (locale === "id" || !requestRecipes.length) {
      setTranslations({});
      setIsTranslating(false);
      return;
    }
    const key = cacheKey(locale, signature);
    const cached = cache.get(key);
    if (cached) {
      setTranslations(cached);
      setIsTranslating(false);
      return;
    }

    const controller = new AbortController();
    setIsTranslating(true);
    const batches = Array.from({ length: Math.ceil(requestRecipes.length / batchSize) }, (_, index) => requestRecipes.slice(index * batchSize, (index + 1) * batchSize));
    Promise.all(batches.map(async (batch) => {
      const response = await fetch("/api/translate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          locale,
          recipes: batch,
        }),
      });
      const payload = await response.json() as { recipes?: TranslatedRecipeContent[]; error?: string };
      if (!response.ok || !payload.recipes) throw new Error(payload.error || "Terjemahan belum dapat dimuat.");
      return payload.recipes;
    })).then((results) => {
      if (controller.signal.aborted) return;
      const translated = Object.fromEntries(results.flat().map((recipe) => [recipe.id, recipe]));
      cache.set(key, translated);
      setTranslations(translated);
    }).catch(() => {
      if (!controller.signal.aborted) setTranslations({});
    }).finally(() => {
      if (!controller.signal.aborted) setIsTranslating(false);
    });
    return () => controller.abort();
  }, [locale, requestRecipes, signature]);

  return { translations, isTranslating };
}
