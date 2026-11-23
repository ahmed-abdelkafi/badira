import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes } from "@/i18n/routes";
import { getContactSettings, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { t } from "@/lib/localized";
import { formatPhoneDisplay } from "@/lib/phone";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "contact", routes.contact, async (l) => {
    const d = await getDictionary(l);
    return { title: d.contact.title, description: d.contact.lead };
  });
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, c] = await Promise.all([getDictionary(lang), getPage("contact"), getContactSettings()]);
  const maps = c.mapsUrl || "https://www.google.com/maps/search/?api=1&query=La+Badira+Hammamet";
  const social = Object.entries(c.social ?? {}).filter(([, u]) => !!u) as [string, string][];

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: dict.contact.address,
      content: (
        <>
          <span>{t(c.address, lang)}</span>
          <a href={maps} target="_blank" rel="noopener noreferrer" className="link-draw mt-2 block text-sm text-stone">{dict.common.openInMaps} ↗</a>
        </>
      ),
    },
    { label: dict.contact.phone, content: <a href={`tel:${c.phone}`} className="link-draw" dir="ltr">{formatPhoneDisplay(c.phone)}</a> },
    ...(c.whatsapp
      ? [{ label: dict.contact.whatsapp, content: <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="link-draw" dir="ltr">{formatPhoneDisplay(c.whatsapp)}</a> }]
      : []),
    { label: dict.contact.email, content: <a href={`mailto:${c.email}`} className="link-draw">{c.email}</a> },
  ];

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="Hammamet" title={dict.contact.title} lead={dict.contact.lead} short />
      <section className="py-24 md:py-36">
        <div className="container-luxe grid gap-16 md:grid-cols-12">
          <dl className="md:col-span-7">
            {rows.map((r) => (
              <div key={r.label} data-reveal className="grid gap-3 border-t border-charcoal/15 py-8 sm:grid-cols-3">
                <dt className="eyebrow text-stone">{r.label}</dt>
                <dd className="display text-2xl sm:col-span-2 md:text-3xl">{r.content}</dd>
              </div>
            ))}
          </dl>
          <aside className="md:col-span-4 md:col-start-9">
            <div className="bg-charcoal p-10 text-ivory">
              <p className="eyebrow text-champagne">{dict.reservation.title}</p>
              <p className="mt-6 text-ivory/80">{dict.reservation.lead}</p>
              <Link href={href(lang, routes.reservations)} className="btn btn-light mt-8">{dict.common.requestReservation}</Link>
            </div>
            {social.length > 0 && (
              <div className="mt-12">
                <p className="eyebrow text-stone">{dict.contact.follow}</p>
                <ul className="mt-4 flex flex-wrap gap-5 text-sm">
                  {social.map(([k, u]) => (
                    <li key={k}><a href={u} target="_blank" rel="noopener noreferrer" className="link-draw capitalize">{k}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
