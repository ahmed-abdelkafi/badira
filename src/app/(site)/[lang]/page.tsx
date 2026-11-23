import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { href, routes, suiteHref } from "@/i18n/routes";
import {
  getActiveSuites,
  getContactSettings,
  getEventOfferings,
  getExperiences,
  getGallery,
  getPage,
  getPublishedTestimonials,
  getRestaurants,
  getSpaServices,
  type PageContent,
} from "@/server/content/queries";
import { t, type Localized } from "@/lib/localized";
import { formatPhoneDisplay } from "@/lib/phone";
import { hotelJsonLd, jsonLd, pageMetadata } from "@/lib/seo";
import { Picture } from "@/components/site/Picture";
import { SplitHeading } from "@/components/site/SplitHeading";
import { CinematicHero, HorizontalTrack, Parallax, ScaleReveal, SectionIndicator, StickySteps } from "@/components/site/motion";
import { SuiteCard } from "@/components/site/SuiteCard";
import { LogoMark } from "@/components/site/Wordmark";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [dict, page] = await Promise.all([getDictionary(lang), getPage("home")]);
  return {
    ...pageMetadata({
      locale: lang,
      path: "",
      title: t(page.seoTitle, lang) || dict.meta.defaultTitle,
      description: t(page.seoDescription, lang) || dict.meta.defaultDescription,
      image: page.og ?? page.hero,
    }),
    title: { absolute: t(page.seoTitle, lang) || dict.meta.defaultTitle },
  };
}

function section(page: PageContent, key: string) {
  const s = page.sections[key];
  return { visible: s?.visible !== false, image: s?.image ?? null, title: s?.title, eyebrow: s?.eyebrow, body: s?.body };
}
const pick = (override: Localized | undefined, fallback: string, locale: Locale) => t(override, locale) || fallback;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang;

  const [dict, page, suites, restaurants, spa, experiences, events, gallery, testimonials, contact] = await Promise.all([
    getDictionary(locale),
    getPage("home"),
    getActiveSuites(),
    getRestaurants(),
    getSpaServices(),
    getExperiences(),
    getEventOfferings(),
    getGallery(),
    getPublishedTestimonials(),
    getContactSettings(),
  ]);
  const h = dict.home;
  const s = {
    intro: section(page, "intro"),
    suites: section(page, "suites"),
    dining: section(page, "dining"),
    spa: section(page, "spa"),
    pools: section(page, "pools"),
    poolsInset: section(page, "poolsInset"),
    experiences: section(page, "experiences"),
    events: section(page, "events"),
    gallery: section(page, "gallery"),
    testimonials: section(page, "testimonials"),
    contact: section(page, "contact"),
  };
  const standard = suites.filter((x) => x.collection === "standard");
  const legend = suites.filter((x) => x.collection === "legend");
  const venues = restaurants;
  const showTestimonials = s.testimonials.visible && testimonials.length > 0;

  const chapters = [
    { id: "concept", label: dict.nav.concept, on: s.intro.visible },
    { id: "suites", label: dict.nav.suites, on: s.suites.visible && suites.length > 0 },
    { id: "dining", label: dict.nav.dining, on: s.dining.visible && venues.length > 0 },
    { id: "spa", label: "Spa", on: s.spa.visible },
    { id: "pools", label: h.poolsEyebrow, on: s.pools.visible },
    { id: "experiences", label: dict.nav.experiences, on: s.experiences.visible && experiences.length > 0 },
    { id: "events", label: dict.nav.events, on: s.events.visible && events.length > 0 },
    { id: "gallery", label: dict.nav.gallery, on: s.gallery.visible && gallery.length > 0 },
    { id: "testimonials", label: h.testimonialsEyebrow, on: showTestimonials },
    { id: "contact", label: dict.nav.contact, on: s.contact.visible },
  ].filter((c) => c.on);

  const ld = hotelJsonLd({
    locale,
    description: dict.meta.defaultDescription,
    phone: contact.phone,
    email: contact.email,
    address: t(contact.address, locale),
    image: page.hero?.src,
    sameAs: Object.values(contact.social ?? {}).filter(Boolean) as string[],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <SectionIndicator sections={chapters.map(({ id, label }) => ({ id, label }))} />

      {/* 1 — HERO */}
      <CinematicHero
        media={page.hero ? <Picture img={page.hero} locale={locale} sizes="100vw" priority quality={85} className="object-cover" /> : <div className="h-full w-full bg-charcoal" />}
      >
        <div className="container-luxe flex h-full flex-col justify-end pb-[12vh]">
          <div data-hero-fade><LogoMark className="mb-8 h-16 w-auto text-ivory md:h-20" title="" /></div>
          <p data-hero-fade className="eyebrow mb-8 text-sand">
            {pick(page.sections.hero?.eyebrow, h.heroEyebrow, locale)}
          </p>
          <h1 className="sr-only">La Badira — {h.heroTitle}</h1>
          <div aria-hidden="true" dir="ltr" className="display display-2xl flex overflow-clip leading-[0.9] rtl:justify-end">
            {"LA BADIRA".split("").map((ch, i) => (
              <span key={i} data-hero-letter className="inline-block" style={{ letterSpacing: "0.04em" }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
            <p className="display display-sm md:col-span-6" aria-hidden="true">
              <span className="line-mask"><span data-hero-line className="italic">{pick(page.sections.hero?.title, h.heroTitle, locale)}</span></span>
            </p>
            <div className="md:col-span-5 md:col-start-8">
              <p data-hero-fade className="lede max-w-md text-ivory/85">{pick(page.sections.hero?.body, h.heroText, locale)}</p>
              <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-6">
                <Link href={href(locale, routes.reservations)} className="btn btn-light">
                  {dict.common.requestReservation}
                </Link>
                <span className="text-xs text-ivory/70">{dict.common.adultsOnly}</span>
              </div>
            </div>
          </div>
        </div>
        <a href="#concept" data-hero-fade className="absolute bottom-6 start-1/2 hidden md:flex -translate-x-1/2 flex-col items-center gap-3 text-ivory/80 rtl:translate-x-1/2" aria-label={dict.common.scroll}>
          <span className="eyebrow text-[0.6rem]">{dict.common.scroll}</span>
          <span className="relative block h-14 w-px overflow-clip bg-ivory/20">
            <span className="animate-scroll-line absolute inset-0 bg-ivory" />
          </span>
        </a>
      </CinematicHero>

      {/* 2 — CONCEPT */}
      {s.intro.visible && (
        <section id="concept" className="relative py-28 md:py-44">
          <div className="container-luxe grid gap-16 md:grid-cols-12">
            <div className="md:col-span-6 lg:col-span-5">
              <p data-reveal className="eyebrow text-champagne-deep">{pick(s.intro.eyebrow, h.introEyebrow, locale)}</p>
              <SplitHeading text={pick(s.intro.title, h.introTitle, locale)} className="display display-xl mt-6 text-balance" />
              <p data-reveal className="lede mt-10 max-w-lg text-stone first-letter:float-start first-letter:me-3 first-letter:font-[family-name:var(--font-display)] first-letter:text-6xl first-letter:leading-[0.8] first-letter:text-champagne">
                {pick(s.intro.body, h.introText, locale)}
              </p>
              <Link data-reveal href={href(locale, routes.concept)} className="link-draw mt-10 inline-block text-sm tracking-[0.2em] uppercase rtl:tracking-normal">
                {dict.common.discover} — {dict.nav.concept}
              </Link>
            </div>
            {s.intro.image && (
              <div className="md:col-span-6 md:col-start-7 lg:col-span-6 lg:col-start-7">
                <div data-clip className="relative aspect-[4/5] md:mt-24">
                  <Parallax amount={14} className="absolute inset-0">
                    <Picture img={s.intro.image} locale={locale} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                  </Parallax>
                </div>
              </div>
            )}
          </div>
          <div className="mt-28 overflow-clip border-y border-charcoal/10 py-6" aria-label={h.introArtists}>
            <p className="sr-only">{h.introArtists}: Paul Klee, André Gide, Arletty, Oscar Wilde, August Macke</p>
            <div className="animate-marquee flex w-max gap-16 whitespace-nowrap" aria-hidden="true">
              {[0, 1].map((k) => (
                <div key={k} className="display flex gap-16 text-[clamp(1.6rem,3.2vw,3rem)] italic text-charcoal/70">
                  {["Paul Klee", "André Gide", "Arletty", "Oscar Wilde", "August Macke"].map((n) => (
                    <span key={n} className="flex items-center gap-16">
                      {n}
                      <span className="ornament inline-block text-champagne" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3 — SUITES: sticky storytelling across the two collections */}
      {s.suites.visible && suites.length > 0 && (
        <section id="suites" className="bg-mist py-28 md:py-40">
          <div className="container-luxe">
            <div className="mb-20 grid gap-8 md:grid-cols-12">
              <p data-reveal className="eyebrow text-champagne-deep md:col-span-3">{pick(s.suites.eyebrow, h.suitesEyebrow, locale)}</p>
              <div className="md:col-span-8 md:col-start-5">
                <SplitHeading text={pick(s.suites.title, h.suitesTitle, locale)} className="display display-lg text-balance" />
                <p data-reveal className="lede mt-8 max-w-2xl text-stone">{pick(s.suites.body, h.suitesText, locale)}</p>
              </div>
            </div>
            <StickySteps
              steps={[
                <div key="std">
                  <p className="eyebrow text-champagne-deep">01</p>
                  <h3 className="display display-md mt-4">{dict.suites.standard}</h3>
                  <p className="mt-6 max-w-sm text-stone">{dict.suites.standardText}</p>
                  <ul className="mt-8 space-y-2 text-sm">
                    {standard.map((x) => (
                      <li key={x.id}>
                        <Link href={suiteHref(locale, x.slug)} className="link-draw">{x.name}</Link>
                        {x.areaSqm ? <span className="ms-3 text-stone"><bdi dir="ltr">{x.areaSqm} m²</bdi></span> : null}
                      </li>
                    ))}
                  </ul>
                </div>,
                <div key="leg">
                  <p className="eyebrow text-champagne-deep">02</p>
                  <h3 className="display display-md mt-4">{dict.suites.legend}</h3>
                  <p className="mt-6 max-w-sm text-stone">{dict.suites.legendText}</p>
                  <Link href={href(locale, routes.suites)} className="btn btn-dark mt-10">{dict.common.viewAll}</Link>
                </div>,
              ]}
              media={[
                <div key="m-std" className="grid grid-cols-2 gap-4 md:gap-6">
                  {standard.slice(0, 4).map((x, i) => (
                    <div key={x.id} className={i % 2 === 1 ? "md:mt-24" : ""}>
                      <SuiteCard suite={x} locale={locale} dict={dict} compact />
                    </div>
                  ))}
                </div>,
                <ol key="m-leg" className="border-t border-charcoal/15">
                  {legend.map((x, i) => (
                    <li key={x.id} className="border-b border-charcoal/15">
                      <Link href={suiteHref(locale, x.slug)} className="group flex items-baseline justify-between gap-6 py-7">
                        <span className="flex items-baseline gap-6">
                          <span className="text-xs text-stone">{String(i + 1).padStart(2, "0")}</span>
                          <span className="display text-[clamp(1.6rem,2.6vw,2.4rem)] transition-transform duration-700 group-hover:translate-x-3 rtl:group-hover:-translate-x-3">{x.name.replace(/ Suite$/, "")}</span>
                        </span>
                        <span className="hidden text-sm text-stone italic sm:block">{t(x.tagline, locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>,
              ]}
            />
          </div>
        </section>
      )}

      {/* 4 — DINING: menu-card typographic list on charcoal */}
      {s.dining.visible && venues.length > 0 && (
        <section id="dining" className="grain relative overflow-clip bg-charcoal py-28 text-ivory md:py-40">
          <div className="container-luxe grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p data-reveal className="eyebrow text-champagne">{pick(s.dining.eyebrow, h.diningEyebrow, locale)}</p>
              <SplitHeading text={pick(s.dining.title, h.diningTitle, locale)} className="display display-lg mt-6 text-balance" />
              <p data-reveal className="mt-8 text-ivory/70">{pick(s.dining.body, h.diningText, locale)}</p>
              {s.dining.image && (
                <div data-clip className="relative mt-12 hidden aspect-[3/4] max-w-xs lg:block">
                  <Picture img={s.dining.image} locale={locale} sizes="320px" className="object-cover" />
                </div>
              )}
            </div>
            <ul className="lg:col-span-7 lg:col-start-6">
              {venues.map((v, i) => (
                <li key={v.id} data-reveal style={{ ["--reveal-i" as string]: i }} className="group grid grid-cols-12 items-baseline gap-4 border-b border-ivory/12 py-6">
                  <span className="col-span-2 text-xs text-sand/50 sm:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                  <div className="col-span-10 sm:col-span-7">
                    <h3 className="display text-[clamp(1.7rem,2.8vw,2.6rem)] transition-colors duration-500 group-hover:text-champagne">{v.name}</h3>
                    <p className="mt-1 text-sm text-ivory/60">{t(v.cuisine, locale)}</p>
                  </div>
                  <p className="col-span-10 col-start-3 text-sm text-ivory/70 sm:col-span-4 sm:col-start-auto sm:text-end" dir="auto">
                    <span dir="ltr" className="tabular-nums">{v.hours}</span>
                    {t(v.season, locale) && <span className="block text-xs text-ivory/45">{t(v.season, locale)}</span>}
                    {t(v.closedDays, locale) && <span className="block text-xs text-ivory/45">{t(v.closedDays, locale)}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="container-luxe mt-14">
            <Link href={href(locale, routes.dining)} className="btn btn-light">{dict.common.discover}</Link>
          </div>
        </section>
      )}

      {/* 5 — SPA: portrait image + numbered facilities */}
      {s.spa.visible && (
        <section id="spa" className="py-28 md:py-44">
          <div className="container-luxe grid items-center gap-16 md:grid-cols-12">
            {s.spa.image && (
              <div className="md:col-span-5">
                <ScaleReveal className="relative aspect-[4/5]">
                  <Picture img={s.spa.image} locale={locale} sizes="(min-width: 768px) 42vw, 100vw" className="object-cover" />
                </ScaleReveal>
              </div>
            )}
            <div className="md:col-span-6 md:col-start-7">
              <p data-reveal className="eyebrow text-champagne-deep">{pick(s.spa.eyebrow, h.spaEyebrow, locale)}</p>
              <SplitHeading text={pick(s.spa.title, h.spaTitle, locale)} className="display display-xl mt-6 italic" />
              <p data-reveal className="lede mt-8 max-w-lg text-stone">{pick(s.spa.body, h.spaText, locale)}</p>
              <ol className="mt-12 grid gap-x-10 sm:grid-cols-2">
                {spa.slice(0, 6).map((f, i) => (
                  <li key={f.id} data-reveal style={{ ["--reveal-i" as string]: i }} className="flex gap-4 border-t border-charcoal/12 py-5">
                    <span className="text-xs text-champagne-deep">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm">{t(f.title, locale)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href={href(locale, routes.spa)} className="btn btn-dark">{dict.common.discover}</Link>
                {contact.spaBookingUrl && (
                  <a href={contact.spaBookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-solid">{dict.common.bookSpa}</a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6 — POOLS & SEA: full-bleed parallax with inset */}
      {s.pools.visible && s.pools.image && (
        <section id="pools" className="relative">
          <Parallax amount={20} className="relative h-[110svh] min-h-[600px]">
            <Picture img={s.pools.image} locale={locale} sizes="100vw" className="object-cover" />
          </Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/25 to-transparent" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/55 via-charcoal/15 to-transparent rtl:bg-gradient-to-l" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 text-ivory">
            <div className="container-luxe grid items-end gap-10 pb-16 md:grid-cols-12 md:pb-24">
              <div className="md:col-span-7">
                <p data-reveal className="eyebrow text-sand">{pick(s.pools.eyebrow, h.poolsEyebrow, locale)}</p>
                <SplitHeading text={pick(s.pools.title, h.poolsTitle, locale)} className="display display-xl mt-6 text-balance" />
                <p data-reveal className="lede mt-6 max-w-xl text-ivory/85">{pick(s.pools.body, h.poolsText, locale)}</p>
              </div>
              {s.poolsInset.visible && s.poolsInset.image && (
                <div data-clip className="relative hidden aspect-square w-full max-w-[280px] justify-self-end md:col-span-3 md:col-start-10 md:block">
                  <Picture img={s.poolsInset.image} locale={locale} sizes="280px" className="object-cover" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 7 — EXPERIENCES: editorial three columns */}
      {s.experiences.visible && experiences.length > 0 && (
        <section id="experiences" className="py-28 md:py-40">
          <div className="container-luxe">
            <div className="grid gap-10 md:grid-cols-12">
              <p data-reveal className="eyebrow text-champagne-deep md:col-span-3">{pick(s.experiences.eyebrow, h.experiencesEyebrow, locale)}</p>
              <div className="md:col-span-9">
                <SplitHeading text={pick(s.experiences.title, h.experiencesTitle, locale)} className="display display-lg" />
                <p data-reveal className="lede mt-6 max-w-2xl text-stone">{pick(s.experiences.body, h.experiencesText, locale)}</p>
              </div>
            </div>
            <div className="mt-20 grid gap-px bg-charcoal/12 md:grid-cols-3">
              {experiences.map((e, i) => (
                <article key={e.id} data-reveal style={{ ["--reveal-i" as string]: i }} className="group bg-ivory p-8 md:p-12">
                  <span className="ornament text-champagne transition-transform duration-700 group-hover:rotate-45" />
                  <h3 className="display display-sm mt-8">{t(e.title, locale)}</h3>
                  <p className="mt-4 text-stone">{t(e.description, locale)}</p>
                </article>
              ))}
            </div>
            <Link href={href(locale, routes.experiences)} className="link-draw mt-12 inline-block text-sm tracking-[0.2em] uppercase rtl:tracking-normal">
              {dict.common.discover} — {dict.nav.experiences}
            </Link>
          </div>
        </section>
      )}

      {/* 8 — EVENTS & WEDDINGS */}
      {s.events.visible && events.length > 0 && (
        <section id="events" className="relative overflow-clip bg-charcoal text-ivory">
          <div className="grid lg:grid-cols-2">
            {s.events.image && (
              <div className="relative min-h-[60vh] lg:min-h-[90vh]">
                <Parallax amount={16} className="absolute inset-0">
                  <Picture img={s.events.image} locale={locale} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </Parallax>
              </div>
            )}
            <div className="flex flex-col justify-center px-[clamp(1.25rem,5vw,5rem)] py-24">
              <p data-reveal className="eyebrow text-champagne">{pick(s.events.eyebrow, h.eventsEyebrow, locale)}</p>
              <SplitHeading text={pick(s.events.title, h.eventsTitle, locale)} className="display display-lg mt-6 max-w-xl text-balance" />
              <div className="mt-14 space-y-10">
                {events.map((e) => (
                  <article key={e.id} data-reveal className="border-t border-ivory/15 pt-8">
                    <h3 className="display display-sm">{t(e.title, locale)}</h3>
                    <p className="mt-3 max-w-lg text-ivory/70">{t(e.description, locale)}</p>
                    {e.brochureUrl && (
                      <a href={e.brochureUrl} target="_blank" rel="noopener noreferrer" className="link-draw mt-5 inline-block text-xs tracking-[0.25em] uppercase text-sand rtl:tracking-normal">
                        {dict.common.brochure} ↗
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9 — GALLERY: pinned horizontal track */}
      {s.gallery.visible && gallery.length > 0 && (
        <section id="gallery" className="bg-ivory">
          <div className="container-luxe flex items-end justify-between gap-6 pb-12 pt-28 md:pt-40">
            <div>
              <p data-reveal className="eyebrow text-champagne-deep">{pick(s.gallery.eyebrow, h.galleryEyebrow, locale)}</p>
              <SplitHeading text={pick(s.gallery.title, h.galleryTitle, locale)} className="display display-lg mt-6" />
            </div>
            <Link href={href(locale, routes.gallery)} className="btn btn-dark hidden md:inline-flex">{dict.common.viewAll}</Link>
          </div>
          <HorizontalTrack className="pb-28 lg:flex lg:h-screen lg:items-center lg:pb-0" label={dict.nav.gallery}>
            {gallery.slice(0, 9).map((g, i) => {
              const portrait = g.image.height > g.image.width;
              return (
                <figure key={g.id} className={`relative shrink-0 snap-start ${portrait ? "w-[70vw] md:w-[28vw]" : "w-[85vw] md:w-[46vw]"} ${i % 2 ? "lg:mt-24" : "lg:-mt-12"}`}>
                  <div className={`relative ${portrait ? "aspect-[4/5]" : "aspect-[3/2]"} overflow-clip`}>
                    <Picture img={g.image} locale={locale} sizes="(min-width: 768px) 46vw, 85vw" className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-luxe)] hover:scale-105" />
                  </div>
                  <figcaption className="mt-3 flex gap-4 text-xs text-stone">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <span>{t(g.caption, locale)}</span>
                  </figcaption>
                </figure>
              );
            })}
          </HorizontalTrack>
        </section>
      )}

      {/* 10 — TESTIMONIALS (only when real testimonials are published) */}
      {showTestimonials && (
        <section id="testimonials" className="bg-mist py-28 md:py-40">
          <div className="container-luxe">
            <p data-reveal className="eyebrow text-champagne-deep">{h.testimonialsEyebrow}</p>
            <h2 className="sr-only">{h.testimonialsTitle}</h2>
            <div className="mt-12 grid gap-16 md:grid-cols-2">
              {testimonials.slice(0, 4).map((tm) => (
                <figure key={tm.id} data-reveal>
                  <blockquote className="display display-sm italic leading-snug text-balance">“{t(tm.quote, locale)}”</blockquote>
                  <figcaption className="mt-6 text-sm text-stone">
                    {tm.author}
                    {tm.origin ? ` · ${tm.origin}` : ""}
                    {tm.source ? ` · ${tm.source}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 11 — LOCATION & CONTACT */}
      {s.contact.visible && (
        <section id="contact" className="py-28 md:py-40">
          <div className="container-luxe grid gap-16 md:grid-cols-12">
            <div className="md:col-span-6">
              <p data-reveal className="eyebrow text-champagne-deep">{pick(s.contact.eyebrow, h.contactEyebrow, locale)}</p>
              <SplitHeading text={pick(s.contact.title, h.contactTitle, locale)} className="display display-xl mt-6" />
            </div>
            <dl className="grid gap-8 self-end sm:grid-cols-2 md:col-span-5 md:col-start-8">
              <div data-reveal>
                <dt className="eyebrow text-stone">{dict.contact.address}</dt>
                <dd className="mt-3">{t(contact.address, locale)}</dd>
                <dd className="mt-3">
                  <a className="link-draw text-sm" target="_blank" rel="noopener noreferrer" href={contact.mapsUrl || "https://www.google.com/maps/search/?api=1&query=La+Badira+Hammamet"}>
                    {dict.common.openInMaps} ↗
                  </a>
                </dd>
              </div>
              <div data-reveal>
                <dt className="eyebrow text-stone">{dict.contact.phone}</dt>
                <dd className="mt-3"><a className="link-draw" href={`tel:${contact.phone}`} dir="ltr">{formatPhoneDisplay(contact.phone)}</a></dd>
              </div>
              {contact.whatsapp && (
                <div data-reveal>
                  <dt className="eyebrow text-stone">{dict.contact.whatsapp}</dt>
                  <dd className="mt-3"><a className="link-draw" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" dir="ltr">{formatPhoneDisplay(contact.whatsapp)}</a></dd>
                </div>
              )}
              <div data-reveal>
                <dt className="eyebrow text-stone">{dict.contact.email}</dt>
                <dd className="mt-3"><a className="link-draw" href={`mailto:${contact.email}`}>{contact.email}</a></dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </>
  );
}
