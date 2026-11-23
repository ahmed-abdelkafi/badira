import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { locales, localeMeta } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { ContactSettings } from "@/server/content/queries";
import { href, routes } from "@/i18n/routes";
import { t } from "@/lib/localized";
import { formatPhoneDisplay } from "@/lib/phone";
import { Lockup } from "./Wordmark";

export function Footer({ locale, dict, contact }: { locale: Locale; dict: Dictionary; contact: ContactSettings }) {
  const nav: [string, string][] = [
    [dict.nav.concept, href(locale, routes.concept)],
    [dict.nav.suites, href(locale, routes.suites)],
    [dict.nav.dining, href(locale, routes.dining)],
    [dict.nav.spa, href(locale, routes.spa)],
    [dict.nav.experiences, href(locale, routes.experiences)],
    [dict.nav.events, href(locale, routes.events)],
    [dict.nav.gallery, href(locale, routes.gallery)],
    [dict.nav.contact, href(locale, routes.contact)],
  ];
  const social = Object.entries(contact.social ?? {}).filter(([, url]) => !!url) as [string, string][];
  const socialNames: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", twitter: "X / Twitter" };
  const year = 2026;

  return (
    <footer className="grain relative overflow-clip bg-charcoal text-ivory">
      <div className="container-luxe pt-24 md:pt-32">
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow text-champagne">{dict.common.adultsOnly}</p>
            <p className="display display-sm mt-6 max-w-md text-balance text-ivory/90">{dict.footer.tagline}</p>
            <Link href={href(locale, routes.reservations)} className="btn btn-light mt-10">
              {dict.common.requestReservation}
            </Link>
          </div>
          <nav aria-label={dict.footer.explore} className="md:col-span-3 md:col-start-7">
            <p className="eyebrow mb-6 text-sand/60">{dict.footer.explore}</p>
            <ul className="space-y-3 text-sm">
              {nav.map(([label, url]) => (
                <li key={url}>
                  <Link href={url} className="link-draw text-ivory/80 hover:text-ivory">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-3">
            <p className="eyebrow mb-6 text-sand/60">{dict.footer.contact}</p>
            <address className="space-y-3 text-sm not-italic text-ivory/80">
              <p>{t(contact.address, locale)}</p>
              <p>
                <a href={`tel:${contact.phone}`} className="link-draw" dir="ltr">
                  {formatPhoneDisplay(contact.phone)}
                </a>
              </p>
              {contact.whatsapp && (
                <p>
                  <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} className="link-draw" rel="noopener" target="_blank">
                    WhatsApp · <span dir="ltr">{formatPhoneDisplay(contact.whatsapp)}</span>
                  </a>
                </p>
              )}
              <p>
                <a href={`mailto:${contact.email}`} className="link-draw">
                  {contact.email}
                </a>
              </p>
            </address>
            {social.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs tracking-[0.15em] uppercase text-ivory/60 rtl:tracking-normal">
                {social.map(([k, url]) => (
                  <li key={k}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="link-draw hover:text-ivory">
                      {socialNames[k] ?? k}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mx-auto mt-24 max-w-md select-none text-sand/90" aria-hidden="true">
          <Lockup className="h-auto w-full" />
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-ivory/10 py-8 text-xs text-ivory/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} La Badira. {dict.footer.rights}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {contact.leadersClubUrl && (
              <a href={contact.leadersClubUrl} target="_blank" rel="noopener noreferrer" className="link-draw hover:text-ivory">
                {dict.common.leadingHotels}
              </a>
            )}
            <Link href={href(locale, routes.privacy)} className="link-draw hover:text-ivory">
              {dict.footer.privacy}
            </Link>
            <span className="flex gap-3" aria-label={dict.nav.language}>
              {locales.map((l) => (
                <Link key={l} href={`/${l}`} lang={l} hrefLang={localeMeta[l].hreflang} className={l === locale ? "text-ivory" : "hover:text-ivory"}>
                  {localeMeta[l].short}
                </Link>
              ))}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
