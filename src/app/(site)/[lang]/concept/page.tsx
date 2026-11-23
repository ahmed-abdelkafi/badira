import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes, suiteHref } from "@/i18n/routes";
import { getActiveSuites, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { SplitHeading } from "@/components/site/SplitHeading";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/concept">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "concept", routes.concept, async (l) => {
    const d = await getDictionary(l);
    return { title: d.concept.title, description: d.concept.p1 };
  });
}

export default async function ConceptPage({ params }: PageProps<"/[lang]/concept">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, suites] = await Promise.all([getDictionary(lang), getPage("concept"), getActiveSuites()]);
  const c = dict.concept;
  const legend = suites.filter((s) => s.collection === "legend");

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="Hammamet" title={c.title} lead={c.lead} />

      <section className="py-28 md:py-40">
        <div className="container-luxe grid gap-16 md:grid-cols-12">
          <p data-reveal className="display display-md italic text-champagne-deep md:col-span-4">“Badira”</p>
          <div className="space-y-8 md:col-span-7 md:col-start-6">
            <p data-reveal className="lede">{c.p1}</p>
            <p data-reveal className="lede text-stone">{c.p2}</p>
            <p data-reveal className="lede text-stone">{c.p3}</p>
          </div>
        </div>
      </section>

      <section className="bg-charcoal py-28 text-ivory md:py-40">
        <div className="container-luxe">
          <p data-reveal className="eyebrow text-champagne">{dict.suites.legend}</p>
          <SplitHeading text={c.legendTitle} className="display display-xl mt-6" />
          <p data-reveal className="lede mt-8 max-w-2xl text-ivory/75">{c.legendText}</p>
          <ul className="mt-16 grid gap-px bg-ivory/10 sm:grid-cols-2 lg:grid-cols-3">
            {legend.map((s, i) => (
              <li key={s.id} data-reveal style={{ ["--reveal-i" as string]: i }} className="bg-charcoal">
                <Link href={suiteHref(lang, s.slug)} className="group block p-8 md:p-10">
                  <span className="text-xs text-sand/50">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display display-sm mt-6 transition-colors duration-500 group-hover:text-champagne">{s.name.replace(/ Suite$/, "")}</h3>
                  <p className="mt-3 text-sm text-ivory/60">{t(s.tagline, lang)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={href(lang, routes.suites)} className="btn btn-light mt-16">
            {dict.common.discover} — {dict.nav.suites}
          </Link>
        </div>
      </section>
    </>
  );
}
