import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes } from "@/i18n/routes";
import { getEventOfferings, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { Picture } from "@/components/site/Picture";
import { ScaleReveal } from "@/components/site/motion";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/events">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "events", routes.events, async (l) => {
    const d = await getDictionary(l);
    return { title: d.events.title, description: d.events.lead };
  });
}

export default async function EventsPage({ params }: PageProps<"/[lang]/events">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, offers] = await Promise.all([getDictionary(lang), getPage("events"), getEventOfferings()]);

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="La Badira" title={dict.events.title} lead={dict.events.lead} />
      {offers.map((o, i) => (
        <section key={o.id} className={i % 2 ? "bg-mist py-24 md:py-36" : "py-24 md:py-36"}>
          <div className="container-luxe grid items-center gap-12 md:grid-cols-12">
            {o.image && (
              <ScaleReveal className={`relative aspect-[4/3] md:col-span-7 ${i % 2 ? "md:order-last md:col-start-6" : ""}`}>
                <Picture img={o.image} locale={lang} sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
              </ScaleReveal>
            )}
            <div className={o.image ? "md:col-span-4 md:col-start-9" : "md:col-span-8"}>
              <h2 data-reveal className="display display-lg">{t(o.title, lang)}</h2>
              <p data-reveal className="lede mt-6 text-stone">{t(o.description, lang)}</p>
              <div className="mt-10 flex flex-wrap gap-4">
                {o.brochureUrl && (
                  <a href={o.brochureUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">{dict.common.brochure} ↗</a>
                )}
                <Link href={href(lang, routes.contact)} className="btn btn-solid">{dict.events.enquire}</Link>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
