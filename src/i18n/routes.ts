import type { Locale } from "./config";

export const routes = {
  home: "",
  concept: "/concept",
  suites: "/suites",
  dining: "/dining",
  spa: "/spa",
  experiences: "/experiences",
  events: "/events",
  gallery: "/gallery",
  contact: "/contact",
  reservations: "/reservations",
  privacy: "/privacy",
} as const;

export type RouteKey = keyof typeof routes;

export function href(locale: Locale, path: string = ""): string {
  return `/${locale}${path}`;
}

export function suiteHref(locale: Locale, slug: string): string {
  return `/${locale}/suites/${slug}`;
}
