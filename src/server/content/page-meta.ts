import "server-only";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { t } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import { getPage } from "./queries";

/** Metadata for a CMS-backed page: admin SEO fields override the defaults. */
export async function cmsPageMetadata(
  lang: string,
  key: string,
  path: string,
  fallback: (locale: Locale) => Promise<{ title: string; description: string }>,
): Promise<Metadata> {
  if (!isLocale(lang)) return {};
  const [page, fb] = await Promise.all([getPage(key), fallback(lang)]);
  return pageMetadata({
    locale: lang,
    path,
    title: t(page.seoTitle, lang) || fb.title,
    description: t(page.seoDescription, lang) || fb.description,
    image: page.og ?? page.hero,
  });
}
