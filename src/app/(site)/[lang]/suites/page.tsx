import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes } from "@/i18n/routes";
import { getActiveSuites, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { SuiteCard } from "@/components/site/SuiteCard";
import { SplitHeading } from "@/components/site/SplitHeading";

export async function generateMetadata({ params }: PageProps<"/[lang]/suites">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "suites", routes.suites, async (l) => {
    const d = await getDictionary(l);
    return { title: d.suites.title, description: d.suites.lead };
  });
}

export default async function SuitesPage({ params }: PageProps<"/[lang]/suites">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, suites] = await Promise.all([getDictionary(lang), getPage("suites"), getActiveSuites()]);
  const standard = suites.filter((s) => s.collection === "standard");
  const legend = suites.filter((s) => s.collection === "legend");

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="La Badira" title={dict.suites.title} lead={dict.suites.lead} />

      {standard.length > 0 && (
        <section className="py-28 md:py-36" aria-labelledby="standard">
          <div className="container-luxe">
            <div className="mb-16 grid gap-6 md:grid-cols-12">
              <p className="eyebrow text-champagne-deep md:col-span-3">01</p>
              <div className="md:col-span-8 md:col-start-5">
                <SplitHeading text={dict.suites.standard} className="display display-lg" />
                <p data-reveal className="lede mt-6 text-stone">{dict.suites.standardText}</p>
              </div>
            </div>
            <span id="standard" className="sr-only">{dict.suites.standard}</span>
            <div className="grid gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
              {standard.map((s, i) => (
                <div key={s.id} className={i % 3 === 1 ? "lg:mt-24" : ""}>
                  <SuiteCard suite={s} locale={lang} dict={dict} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {legend.length > 0 && (
        <section className="bg-mist py-28 md:py-36" aria-labelledby="legend">
          <div className="container-luxe">
            <div className="mb-16 grid gap-6 md:grid-cols-12">
              <p className="eyebrow text-champagne-deep md:col-span-3">02</p>
              <div className="md:col-span-8 md:col-start-5">
                <SplitHeading text={dict.suites.legend} className="display display-lg" />
                <p data-reveal className="lede mt-6 text-stone">{dict.suites.legendText}</p>
              </div>
            </div>
            <span id="legend" className="sr-only">{dict.suites.legend}</span>
            <div className="grid gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
              {legend.map((s) => (
                <SuiteCard key={s.id} suite={s} locale={lang} dict={dict} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-24 text-center">
        <p data-reveal className="eyebrow text-stone">{dict.common.adultsOnly}</p>
        <Link href={href(lang, routes.reservations)} className="btn btn-solid mt-8">{dict.common.requestReservation}</Link>
      </section>
    </>
  );
}
