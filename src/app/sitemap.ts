import type { MetadataRoute } from "next";
import { defaultLocale, localeMeta, locales } from "@/i18n/config";
import { routes } from "@/i18n/routes";
import { getActiveSuites } from "@/server/content/queries";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** One entry per locale and page, each with hreflang alternates (x-default = FR). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const suites = await getActiveSuites();
  const paths: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: routes.home, priority: 1, freq: "weekly" },
    { path: routes.suites, priority: 0.9, freq: "monthly" },
    { path: routes.reservations, priority: 0.9, freq: "yearly" },
    { path: routes.concept, priority: 0.7, freq: "yearly" },
    { path: routes.dining, priority: 0.8, freq: "monthly" },
    { path: routes.spa, priority: 0.8, freq: "monthly" },
    { path: routes.experiences, priority: 0.6, freq: "monthly" },
    { path: routes.events, priority: 0.7, freq: "monthly" },
    { path: routes.gallery, priority: 0.6, freq: "monthly" },
    { path: routes.contact, priority: 0.6, freq: "yearly" },
    ...suites.map((s) => ({ path: `/suites/${s.slug}`, priority: 0.8, freq: "monthly" as const })),
  ];
  return paths.flatMap(({ path, priority, freq }) => {
    const languages = Object.fromEntries([
      ...locales.map((l) => [localeMeta[l].hreflang, `${base}/${l}${path}`]),
      ["x-default", `${base}/${defaultLocale}${path}`],
    ]);
    return locales.map((l) => ({
      url: `${base}/${l}${path}`,
      changeFrequency: freq,
      priority,
      alternates: { languages },
    }));
  });
}
