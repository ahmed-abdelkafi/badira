import type { Metadata } from "next";
import { defaultLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { t, type Localized } from "@/lib/localized";

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Canonical + hreflang alternates (incl. x-default) for a locale-agnostic path like "/suites". */
export function alternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeMeta[l].hreflang] = `${siteUrl()}/${l}${path}`;
  languages["x-default"] = `${siteUrl()}/${defaultLocale}${path}`;
  return { canonical: `${siteUrl()}/${locale}${path}`, languages };
}

type ImgLike = { src: string; width: number; height: number; alt: Localized } | null | undefined;

export function pageMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: ImgLike;
  type?: "website" | "article";
}): Metadata {
  const images = opts.image
    ? [{ url: `${siteUrl()}${opts.image.src}`, width: opts.image.width, height: opts.image.height, alt: t(opts.image.alt, opts.locale) }]
    : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: alternates(opts.locale, opts.path),
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: `${siteUrl()}/${opts.locale}${opts.path}`,
      siteName: "La Badira",
      locale: localeMeta[opts.locale].ogLocale,
      alternateLocale: locales.filter((l) => l !== opts.locale).map((l) => localeMeta[l].ogLocale),
      type: opts.type ?? "website",
      images,
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: images?.map((i) => i.url) },
  };
}

/** Safe JSON-LD serialisation (prevents </script> injection). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function hotelJsonLd(opts: {
  locale: Locale;
  description: string;
  phone: string;
  email: string;
  address: string;
  image?: string;
  sameAs: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["Hotel", "LocalBusiness"],
    "@id": `${siteUrl()}/#hotel`,
    name: "La Badira",
    description: opts.description,
    url: `${siteUrl()}/${opts.locale}`,
    telephone: opts.phone,
    email: opts.email,
    image: opts.image ? `${siteUrl()}${opts.image}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: "BP437",
      addressLocality: "Hammamet",
      postalCode: "8050",
      addressCountry: "TN",
    },
    sameAs: opts.sameAs,
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Spa by Clarins", value: true },
      { "@type": "LocationFeatureSpecification", name: "Infinity pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Heated indoor pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Hammam", value: true },
      { "@type": "LocationFeatureSpecification", name: "Fitness room", value: true },
    ],
    // Verified: adults only, over 16.
    additionalProperty: [{ "@type": "PropertyValue", name: "Minimum guest age", value: 16 }],
  };
}
