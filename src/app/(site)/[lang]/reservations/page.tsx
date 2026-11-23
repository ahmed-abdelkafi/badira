import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes } from "@/i18n/routes";
import { getActiveSuites, getContactSettings } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { categoryLabel } from "@/lib/categories";
import { formatPhoneDisplay } from "@/lib/phone";
import { ReservationForm } from "@/components/site/ReservationForm";

export async function generateMetadata({ params }: PageProps<"/[lang]/reservations">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "reservations", routes.reservations, async (l) => {
    const d = await getDictionary(l);
    return { title: d.reservation.title, description: d.reservation.lead };
  });
}

export default async function ReservationsPage({ params }: PageProps<"/[lang]/reservations">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, suites, contact] = await Promise.all([getDictionary(lang), getActiveSuites(), getContactSettings()]);
  const r = dict.reservation;

  return (
    <section className="pb-28 pt-36 md:pt-48">
      <div className="container-luxe grid gap-16 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <p className="eyebrow text-champagne-deep">La Badira</p>
          <h1 className="display display-lg mt-6 text-balance">{r.title}</h1>
          <p className="lede mt-6 text-stone">{r.lead}</p>
          <p className="mt-10 border-s-2 border-champagne ps-4 text-sm">{r.notice}</p>
          <div className="mt-10 space-y-2 text-sm text-stone">
            <p>{dict.contact.phone} · <a className="link-draw" href={`tel:${contact.phone}`} dir="ltr">{formatPhoneDisplay(contact.phone)}</a></p>
            <p>{dict.contact.email} · <a className="link-draw" href={`mailto:${contact.email}`}>{contact.email}</a></p>
          </div>
        </header>
        <div className="lg:col-span-7 lg:col-start-6">
          <Suspense fallback={<div className="h-[520px] animate-pulse bg-mist" aria-hidden="true" />}>
            <ReservationForm
              locale={lang}
              t={r}
              suites={suites.map((s) => ({ slug: s.slug, name: s.name, collection: s.collection }))}
              categoryLabels={{
                any: categoryLabel("any", lang),
                standard: categoryLabel("standard", lang),
                legend: categoryLabel("legend", lang),
              }}
              privacyHref={href(lang, routes.privacy)}
              homeHref={href(lang)}
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
