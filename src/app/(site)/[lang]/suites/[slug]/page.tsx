import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes, suiteHref } from "@/i18n/routes";
import { getActiveSuites, getSuiteBySlug } from "@/server/content/queries";
import { isEmptyLocalized, t } from "@/lib/localized";
import { jsonLd, pageMetadata, siteUrl } from "@/lib/seo";
import { collectionLabels } from "@/lib/categories";
import { PageHero } from "@/components/site/PageHero";
import { Picture } from "@/components/site/Picture";
import { SuiteCard } from "@/components/site/SuiteCard";
import { ScaleReveal } from "@/components/site/motion";

export async function generateMetadata({ params }: PageProps<"/[lang]/suites/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const suite = await getSuiteBySlug(slug);
  if (!suite) return {};
  return pageMetadata({
    locale: lang,
    path: `/suites/${slug}`,
    title: t(suite.seoTitle, lang) || suite.name,
    description: t(suite.seoDescription, lang) || t(suite.tagline, lang) || t(suite.description, lang).slice(0, 160),
    image: suite.image,
  });
}

export default async function SuitePage({ params }: PageProps<"/[lang]/suites/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, suite, all] = await Promise.all([getDictionary(lang), getSuiteBySlug(slug), getActiveSuites()]);
  if (!suite) notFound();
  const d = dict.suites;
  const others = all.filter((s) => s.id !== suite.id && s.collection === suite.collection).slice(0, 3);
  const gallery = suite.gallery.filter((g) => g.id !== suite.image?.id);

  // Only verified facts are shown: empty fields are omitted entirely.
  const facts: [string, string][] = [];
  if (suite.areaSqm) facts.push([d.area, `\u2066${suite.areaSqm} m²\u2069`]); // LTR isolate for RTL locales
  if (suite.maxOccupancy) facts.push([d.occupancy, `${suite.maxOccupancy} ${d.guestsUnit}`]);
  if (!isEmptyLocalized(suite.bedConfiguration)) facts.push([d.beds, t(suite.bedConfiguration, lang)]);
  if (suite.view || !isEmptyLocalized(suite.viewDetails))
    facts.push([d.view, t(suite.viewDetails, lang) || (suite.view ? d.viewTypes[suite.view] : "")]);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Suite",
    name: suite.name,
    description: t(suite.description, lang),
    url: `${siteUrl()}${suiteHref(lang, suite.slug)}`,
    image: suite.image ? `${siteUrl()}${suite.image.src}` : undefined,
    floorSize: suite.areaSqm ? { "@type": "QuantitativeValue", value: suite.areaSqm, unitCode: "MTK" } : undefined,
    occupancy: suite.maxOccupancy ? { "@type": "QuantitativeValue", maxValue: suite.maxOccupancy } : undefined,
    containedInPlace: { "@id": `${siteUrl()}/#hotel` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero locale={lang} image={suite.image} eyebrow={collectionLabels[suite.collection][lang]} title={suite.name} lead={t(suite.tagline, lang)}>
        <nav aria-label="Breadcrumb" className="order-first mb-10 text-xs text-ivory/70">
          <ol className="flex gap-2">
            <li><Link href={href(lang, routes.suites)} className="link-draw">{dict.nav.suites}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{suite.name}</li>
          </ol>
        </nav>
      </PageHero>

      <section className="py-24 md:py-36">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p data-reveal className="display display-sm leading-snug text-pretty first-letter:text-champagne">{t(suite.description, lang)}</p>
            {suite.features.length > 0 && (
              <div className="mt-14">
                <h2 className="eyebrow text-champagne-deep">{d.features}</h2>
                <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
                  {suite.features.map((f, i) => (
                    <li key={i} data-reveal style={{ ["--reveal-i" as string]: i }} className="flex items-center gap-4 border-t border-charcoal/12 py-4 text-sm">
                      <span className="ornament shrink-0 text-champagne" aria-hidden="true" />
                      {t(f, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suite.amenities.length > 0 && (
              <div className="mt-14">
                <h2 className="eyebrow text-champagne-deep">{d.amenities}</h2>
                <ul className="mt-6 columns-2 gap-8 text-sm text-stone">
                  {suite.amenities.map((a, i) => (
                    <li key={i} className="break-inside-avoid py-2">{t(a, lang)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-32">
              {facts.length > 0 && (
                <dl className="border-t border-charcoal/15">
                  {facts.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-6 border-b border-charcoal/15 py-5">
                      <dt className="eyebrow text-stone">{k}</dt>
                      <dd className="text-end"><bdi>{v}</bdi></dd>
                    </div>
                  ))}
                </dl>
              )}
              <Link href={`${href(lang, routes.reservations)}?suite=${suite.slug}`} className="btn btn-solid mt-10 w-full">
                {d.reserveThis}
              </Link>
              <p className="mt-4 text-center text-xs text-stone">{dict.common.adultsOnly}</p>
            </div>
          </aside>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="pb-28" aria-label={d.gallery}>
          <div className="container-luxe grid gap-6 md:grid-cols-12">
            {gallery.map((g, i) => (
              <ScaleReveal key={g.id} className={`relative ${i % 3 === 0 ? "aspect-[16/10] md:col-span-12" : "aspect-[4/5] md:col-span-6"}`}>
                <Picture img={g} locale={lang} sizes={i % 3 === 0 ? "100vw" : "(min-width: 768px) 50vw, 100vw"} className="object-cover" />
              </ScaleReveal>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="bg-mist py-24 md:py-32">
          <div className="container-luxe">
            <h2 className="display display-md">{d.otherSuites}</h2>
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((s) => (
                <SuiteCard key={s.id} suite={s} locale={lang} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
