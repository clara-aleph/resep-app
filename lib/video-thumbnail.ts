import getFacebookVideoInfo from "@renpwn/fb-downloader";
import { instagram as getInstagramVideoInfo } from "@jerrycoder/instagram-api";

const scrapeHeaders = { "User-Agent": "Mozilla/5.0 (compatible; KoleksiResepku/1.0)" };

function asHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.startsWith("//") ? `https:${value}` : value;
  try { return new URL(normalized).protocol === "https:" ? normalized : null; } catch { return null; }
}

function isYoutube(url: string) { const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be"; }
function isFacebook(url: string) { const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); return host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch"; }
function isInstagram(url: string) { const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); return host === "instagram.com" || host === "m.instagram.com"; }
function isTikTok(url: string) { const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); return host === "tiktok.com" || host.endsWith(".tiktok.com") || host === "vt.tiktok.com" || host === "vm.tiktok.com"; }

function decodeHtml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function metaValue(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) { const match = html.match(pattern); if (match?.[1]) return decodeHtml(match[1]).trim(); }
  return null;
}

export type PageMetadata = { title: string | null; description: string | null; image: string | null };

/** Captures caption-like metadata exposed by public social pages, without browser CORS. */
export async function getPageMetadata(url: string): Promise<PageMetadata> {
  try {
    const response = await fetch(url, { cache: "no-store", headers: scrapeHeaders });
    if (!response.ok) return { title: null, description: null, image: null };
    const html = await response.text();
    const jsonLdDescriptions = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .flatMap((match) => { try { const data = JSON.parse(match[1]) as unknown; return Array.isArray(data) ? data : [data]; } catch { return []; } })
      .flatMap((item) => item && typeof item === "object" ? [item as Record<string, unknown>] : [])
      .map((item) => [item.caption, item.description, item.articleBody, item.name].find((value): value is string => typeof value === "string" && value.trim().length > 0))
      .filter((value): value is string => Boolean(value));
    return {
      title: metaValue(html, "og:title") ?? metaValue(html, "twitter:title"),
      description: metaValue(html, "og:description") ?? metaValue(html, "description") ?? jsonLdDescriptions[0] ?? null,
      image: asHttpsUrl(metaValue(html, "og:image") ?? metaValue(html, "twitter:image")),
    };
  } catch { return { title: null, description: null, image: null }; }
}

export async function getPermanentCoverSource(url: string) {
  const page = await getPageMetadata(url);
  if (isYoutube(url)) {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { cache: "no-store" });
    const data = response.ok ? await response.json() as { title?: unknown; thumbnail_url?: unknown } : {};
    return { title: typeof data.title === "string" ? data.title : page.title, imageUrl: asHttpsUrl(data.thumbnail_url) ?? page.image, caption: page.description };
  }
  if (isFacebook(url)) {
    const video = await getFacebookVideoInfo(url);
    return { title: typeof video.title === "string" ? video.title : page.title, imageUrl: asHttpsUrl(video.thumbnail) ?? page.image, caption: page.description };
  }
  if (isInstagram(url)) {
    const video = await getInstagramVideoInfo(url) as { title?: unknown; thumbnail?: unknown; thumbnail_url?: unknown; image?: unknown };
    return { title: typeof video.title === "string" ? video.title : page.title, imageUrl: asHttpsUrl(video.thumbnail) ?? asHttpsUrl(video.thumbnail_url) ?? asHttpsUrl(video.image) ?? page.image, caption: page.description };
  }
  if (isTikTok(url)) {
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=0`, { cache: "no-store" });
    const payload = await response.json() as { data?: { title?: unknown; cover?: unknown; origin_cover?: unknown; dynamic_cover?: unknown } };
    return { title: typeof payload.data?.title === "string" ? payload.data.title : page.title, imageUrl: asHttpsUrl(payload.data?.cover) ?? asHttpsUrl(payload.data?.origin_cover) ?? asHttpsUrl(payload.data?.dynamic_cover) ?? page.image, caption: page.description };
  }
  return { title: page.title, imageUrl: page.image, caption: page.description };
}
