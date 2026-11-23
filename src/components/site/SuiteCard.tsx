import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { suiteHref } from "@/i18n/routes";
import { t } from "@/lib/localized";
import type { SuiteSummary } from "@/server/content/queries";
import { Picture } from "./Picture";

/** Initials monogram used when a suite has no photography yet. */
function Monogram({ name }: { name: string }) {
  const initials = name
    .replace(/ Suite$/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-sand/40" aria-hidden="true">
      <div className="absolute inset-6 border border-champagne/40" />
      <span className="display text-[clamp(3rem,7vw,6rem)] italic text-champagne">{initials}</span>
    </div>
  );
}

export function SuiteCard({
  suite,
  locale,
  dict,
  compact = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  suite: SuiteSummary;
  locale: Locale;
  dict: Dictionary;
  compact?: boolean;
  sizes?: string;
}) {
  return (
    <Link href={suiteHref(locale, suite.slug)} className="group block" data-reveal>
      <div className={`relative overflow-clip ${compact ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
        {suite.image ? (
          <Picture img={suite.image} locale={locale} sizes={sizes} className="object-cover transition-transform duration-[1.8s] ease-[var(--ease-luxe)] group-hover:scale-[1.06]" />
        ) : (
          <Monogram name={suite.name} />
        )}
        <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-700 group-hover:bg-charcoal/10" />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className={`display ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>{suite.name}</h3>
        {suite.areaSqm ? <span className="shrink-0 text-xs tabular-nums text-stone"><bdi dir="ltr">{suite.areaSqm} m²</bdi></span> : null}
      </div>
      {!compact && <p className="mt-2 text-sm text-stone">{t(suite.tagline, locale)}</p>}
      {!compact && (
        <span className="mt-4 inline-block text-[0.7rem] tracking-[0.25em] uppercase text-champagne-deep rtl:tracking-normal">
          <span className="link-draw">{dict.suites.discoverSuite}</span>
        </span>
      )}
    </Link>
  );
}
