import Image from "next/image";
import type { Img } from "@/server/content/queries";
import { t } from "@/lib/localized";
import type { Locale } from "@/i18n/config";

/**
 * next/image wrapper: AVIF/WebP via the image optimizer, responsive `sizes`,
 * blur-up placeholder and localized alt text. Lazy unless `priority`.
 */
export function Picture({
  img,
  locale,
  sizes,
  priority = false,
  className = "",
  fill = true,
  quality = 75,
  decorative = false,
}: {
  img: Img;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  quality?: 60 | 75 | 85;
  decorative?: boolean;
}) {
  const alt = decorative ? "" : t(img.alt, locale);
  const common = {
    src: img.src,
    sizes,
    quality,
    preload: priority,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    className,
    ...(img.blur ? { placeholder: "blur" as const, blurDataURL: img.blur } : {}),
  };
  return fill ? <Image {...common} alt={alt} fill /> : <Image {...common} alt={alt} width={img.width} height={img.height} />;
}
