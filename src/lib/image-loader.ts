/**
 * next/image loader. Media from R2 (/media/...) is resized by our own route
 * through the Cloudflare Images binding; anything else is served as-is.
 * Widths/qualities are snapped to a whitelist shared with the route.
 */
export const IMAGE_WIDTHS = [96, 160, 256, 384, 512, 640, 828, 1080, 1280, 1600, 1920, 2400] as const;
export const IMAGE_QUALITIES = [60, 75, 85] as const;

export default function badiraImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!src.startsWith("/media/")) return src;
  const w = IMAGE_WIDTHS.find((x) => x >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  const q = IMAGE_QUALITIES.reduce((best, x) => (Math.abs(x - (quality ?? 75)) < Math.abs(best - (quality ?? 75)) ? x : best), 75);
  return `${src}?w=${w}&q=${q}`;
}
