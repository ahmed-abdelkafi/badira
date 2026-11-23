import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { routes } from "@/i18n/routes";
import { getContactSettings, getPage, getRestaurants } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { Picture } from "@/components/site/Picture";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/dining">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "dining", routes.dining, async (l) => {
    const d = await getDictionary(l);
    return { title: d.dining.title, description: d.dining.lead };
  });
}

export default async function DiningPage({ params }: PageProps<"/[lang]/dining">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, venues, contact] = await Promise.all([getDictionary(lang), getPage("dining"), getRestaurants(), getContactSettings()]);
  const groups = [
    { title: dict.dining.restaurants, items: venues.filter((v) => v.kind !== "bar") },
    { title: dict.dining.bars, items: venues.filter((v) => v.kind === "bar") },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="Chef Ramzi Bouguila" title={dict.dining.title} lead={dict.dining.lead} />
      {groups.map((g, gi) => (
        <section key={g.title} className={gi % 2 ? "bg-charcoal py-24 text-ivory md:py-36" : "py-24 md:py-36"}>
          <div className="container-luxe">
            <h2 className={`eyebrow ${gi % 2 ? "text-champagne" : "text-champagne-deep"}`}>{g.title}</h2>
            <div className="mt-12 space-y-20 md:space-y-28">
              {g.items.map((v, i) => (
                <article key={v.id} className="grid items-center gap-10 md:grid-cols-12">
                  {v.image && (
                    <div data-clip className={`relative aspect-[4/3] md:col-span-6 ${i % 2 ? "md:order-last md:col-start-7" : ""}`}>
                      <Picture img={v.image} locale={lang} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className={v.image ? `md:col-span-5 ${i % 2 ? "" : "md:col-start-8"}` : "md:col-span-8"}>
                    <span className="text-xs opacity-50">{String(i + 1).padStart(2, "0")}</span>
                    <h3 data-reveal className="display display-lg mt-3">{v.name}</h3>
                    <p data-reveal className="mt-3 italic opacity-70">{t(v.cuisine, lang)}</p>
                    <p data-reveal className="lede mt-6 opacity-85">{t(v.description, lang)}</p>
                    <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-current/15 pt-6 text-sm">
                      {v.hours && (
                        <div>
                          <dt className="eyebrow opacity-60">{dict.common.hours}</dt>
                          <dd className="mt-2 tabular-nums" dir="ltr">{v.hours}</dd>
                          {t(v.closedDays, lang) && <dd className="mt-1 opacity-60">{t(v.closedDays, lang)}</dd>}
                        </div>
                      )}
                      {t(v.season, lang) && (
                        <div>
                          <dt className="eyebrow opacity-60">{dict.common.season}</dt>
                          <dd className="mt-2">{t(v.season, lang)}</dd>
                        </div>
                      )}
                    </dl>
                    {v.menuUrl && (
                      <a href={v.menuUrl} target="_blank" rel="noopener noreferrer" className="link-draw mt-8 inline-block text-xs tracking-[0.25em] uppercase rtl:tracking-normal">
                        {dict.common.menuPdf} ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
      {contact.dressCodeUrl && (
        <p className="py-16 text-center text-sm">
          <a href={contact.dressCodeUrl} target="_blank" rel="noopener noreferrer" className="link-draw">{dict.dining.dressCode} ↗</a>
        </p>
      )}
    </>
  );
}
