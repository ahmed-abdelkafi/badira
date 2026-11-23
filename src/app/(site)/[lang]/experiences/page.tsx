import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { routes } from "@/i18n/routes";
import { getContactSettings, getExperiences, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { Picture } from "@/components/site/Picture";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/experiences">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "experiences", routes.experiences, async (l) => {
    const d = await getDictionary(l);
    return { title: d.experiences.title, description: d.experiences.lead };
  });
}

export default async function ExperiencesPage({ params }: PageProps<"/[lang]/experiences">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, items, contact] = await Promise.all([getDictionary(lang), getPage("experiences"), getExperiences(), getContactSettings()]);

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="Clefs d'Or" title={dict.experiences.title} lead={dict.experiences.lead} short />
      <section className="py-28 md:py-40">
        <div className="container-luxe space-y-px bg-charcoal/12">
          {items.map((e, i) => (
            <article key={e.id} className="grid gap-8 bg-ivory py-14 md:grid-cols-12 md:py-20">
              <span className="display display-lg text-champagne md:col-span-2">{String(i + 1).padStart(2, "0")}</span>
              <div className="md:col-span-5">
                <h2 data-reveal className="display display-md">{t(e.title, lang)}</h2>
                <p data-reveal className="lede mt-5 text-stone">{t(e.description, lang)}</p>
              </div>
              {e.image && (
                <div data-clip className="relative aspect-[4/3] md:col-span-4 md:col-start-9">
                  <Picture img={e.image} locale={lang} sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                </div>
              )}
            </article>
          ))}
        </div>
        {contact.conciergeBrochureUrl && (
          <div className="container-luxe mt-16">
            <a href={contact.conciergeBrochureUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">{dict.experiences.brochure} ↗</a>
          </div>
        )}
      </section>
    </>
  );
}
