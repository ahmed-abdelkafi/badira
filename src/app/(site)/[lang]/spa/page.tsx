import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { routes } from "@/i18n/routes";
import { getContactSettings, getPage, getSpaServices } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { SplitHeading } from "@/components/site/SplitHeading";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/spa">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "spa", routes.spa, async (l) => {
    const d = await getDictionary(l);
    return { title: d.spa.title, description: d.spa.lead };
  });
}

export default async function SpaPage({ params }: PageProps<"/[lang]/spa">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, services, contact] = await Promise.all([getDictionary(lang), getPage("spa"), getSpaServices(), getContactSettings()]);
  const facilities = services.filter((s) => s.kind === "facility");
  const treatments = services.filter((s) => s.kind === "treatment");

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="Spa by Clarins" title={dict.spa.title} lead={dict.spa.lead}>
        <div className="mt-10 flex flex-wrap gap-4">
          {contact.spaBookingUrl && (
            <a href={contact.spaBookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light">{dict.common.bookSpa} ↗</a>
          )}
          {contact.spaMenuUrl && (
            <a href={contact.spaMenuUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light">{dict.common.spaMenu} ↗</a>
          )}
        </div>
      </PageHero>

      <section className="py-28 md:py-40">
        <div className="container-luxe">
          <SplitHeading text={dict.home.spaTitle} className="display display-xl italic" />
          <h2 className="eyebrow mt-16 text-champagne-deep">{dict.spa.facilities}</h2>
          <ol className="mt-8 grid gap-px bg-charcoal/12 md:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f, i) => (
              <li key={f.id} data-reveal style={{ ["--reveal-i" as string]: i }} className="bg-ivory p-8 md:p-10">
                <span className="text-xs text-champagne-deep">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display display-sm mt-6">{t(f.title, lang)}</h3>
                <p className="mt-3 text-stone">{t(f.description, lang)}</p>
              </li>
            ))}
          </ol>
          {treatments.length > 0 && (
            <ul className="mt-20 border-t border-charcoal/15">
              {treatments.map((tr) => (
                <li key={tr.id} className="flex items-baseline justify-between gap-6 border-b border-charcoal/15 py-6">
                  <div>
                    <h3 className="display text-2xl">{t(tr.title, lang)}</h3>
                    <p className="mt-1 text-sm text-stone">{t(tr.description, lang)}</p>
                  </div>
                  {tr.durationMinutes ? <span className="shrink-0 text-sm tabular-nums">{tr.durationMinutes} min</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
