import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Amiri, Bodoni_Moda, IBM_Plex_Sans_Arabic, Jost } from "next/font/google";
import "@/styles/globals.css";
import { isLocale, localeMeta } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes } from "@/i18n/routes";
import { getContactSettings } from "@/server/content/queries";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { t } from "@/lib/localized";
import { formatPhoneDisplay } from "@/lib/phone";
import { siteUrl } from "@/lib/seo";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap", axes: ["opsz"] });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap", preload: false });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500"], variable: "--font-plex-ar", display: "swap", preload: false });

/** Content comes from D1 at request time (Cloudflare Workers). */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#1C1C1C",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: dict.meta.defaultTitle, template: `%s — La Badira` },
    description: dict.meta.defaultDescription,
    applicationName: "La Badira",
    openGraph: { siteName: "La Badira", locale: localeMeta[lang].ogLocale, type: "website" },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, contact] = await Promise.all([getDictionary(lang), getContactSettings()]);
  const items = [
    { label: dict.nav.home, href: href(lang) },
    { label: dict.nav.concept, href: href(lang, routes.concept) },
    { label: dict.nav.suites, href: href(lang, routes.suites) },
    { label: dict.nav.dining, href: href(lang, routes.dining) },
    { label: dict.nav.spa, href: href(lang, routes.spa) },
    { label: dict.nav.experiences, href: href(lang, routes.experiences) },
    { label: dict.nav.events, href: href(lang, routes.events) },
    { label: dict.nav.gallery, href: href(lang, routes.gallery) },
    { label: dict.nav.contact, href: href(lang, routes.contact) },
  ];

  return (
    <html
      lang={lang}
      dir={localeMeta[lang].dir}
      className={`${bodoni.variable} ${jost.variable} ${amiri.variable} ${plexArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh" suppressHydrationWarning>
        <a href="#main" className="sr-only z-[60] bg-charcoal px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
          {dict.nav.skipToContent}
        </a>
        <SmoothScroll />
        <Header
          locale={lang}
          items={items}
          homeHref={href(lang)}
          reserve={{ href: href(lang, routes.reservations), label: dict.nav.reserve }}
          labels={{ menu: dict.nav.menu, close: dict.nav.close, language: dict.nav.language, adultsOnly: dict.common.adultsOnly }}
          contact={{ phone: formatPhoneDisplay(contact.phone), email: contact.email, address: t(contact.address, lang) }}
        />
        <main id="main">{children}</main>
        <Footer locale={lang} dict={dict} contact={contact} />
      </body>
    </html>
  );
}
