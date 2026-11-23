import { getCloudflareContext } from "@opennextjs/cloudflare";
import { storage, assertSafeKey } from "@/server/media/storage";
import { IMAGE_QUALITIES, IMAGE_WIDTHS } from "@/lib/image-loader";

/**
 * Serves media from R2.
 *   /media/<key>              → original
 *   /media/<key>?w=1280&q=75  → resized with the Cloudflare Images binding,
 *                               AVIF or WebP depending on the browser.
 * Only whitelisted sizes are accepted (no arbitrary transformations), keys
 * are random and immutable, and resized variants are cached at the edge.
 */
const HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};

function pickFormat(accept: string): "image/avif" | "image/webp" | "image/jpeg" {
  if (accept.includes("image/avif")) return "image/avif";
  if (accept.includes("image/webp")) return "image/webp";
  return "image/jpeg";
}

export async function GET(req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  try {
    assertSafeKey(joined);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const w = Number(url.searchParams.get("w"));
  const q = Number(url.searchParams.get("q") ?? 75);
  const wantsResize = url.searchParams.has("w");
  if (wantsResize && (!(IMAGE_WIDTHS as readonly number[]).includes(w) || !(IMAGE_QUALITIES as readonly number[]).includes(q))) {
    return new Response("Unsupported size", { status: 400 });
  }

  if (wantsResize) {
    const format = pickFormat(req.headers.get("accept") ?? "");
    const cacheKey = new Request(`${url.origin}/media/${joined}?w=${w}&q=${q}&f=${format}`);
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    const hit = await cache?.match(cacheKey).catch(() => undefined);
    if (hit) return hit;

    const obj = await storage().get(joined);
    if (!obj) return new Response("Not found", { status: 404 });
    try {
      const images = getCloudflareContext().env.IMAGES;
      if (!images) throw new Error("IMAGES binding not configured");
      const out = await images.input(obj.body).transform({ width: w, fit: "scale-down" }).output({ format, quality: q });
      const res = new Response(out.image(), { headers: { ...HEADERS, "Content-Type": out.contentType(), Vary: "Accept" } });
      if (cache) {
        getCloudflareContext().ctx.waitUntil(cache.put(cacheKey, res.clone()).catch(() => {}));
      }
      return res;
    } catch (err) {
      console.error("[media] resize failed, serving original:", (err as Error).message);
      const original = await storage().get(joined);
      if (!original) return new Response("Not found", { status: 404 });
      return new Response(original.body, { headers: { ...HEADERS, "Content-Type": original.contentType } });
    }
  }

  const obj = await storage().get(joined);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { ...HEADERS, "Content-Type": obj.contentType, "Content-Length": String(obj.size) } });
}
