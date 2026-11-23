import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

const SESSION_COOKIES = ["lb_admin_session", "__Host-lb_admin_session"];

function preferredLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("lb_locale")?.value;
  if (isLocale(cookie)) return cookie;
  const header = req.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if ((locales as readonly string[]).includes(lang)) return lang as Locale;
  return defaultLocale;
}

/**
 * Edge middleware (kept as `middleware.ts` on purpose: Next 16's `proxy.ts`
 * runs on Node and is only experimental on Cloudflare/OpenNext).
 *
 * 1. Locale negotiation for public pages ("/suites" → "/fr/suites").
 * 2. Optimistic admin gate: no session cookie → login page.
 *    This is NOT the security boundary — every admin page/action/route
 *    re-validates the session in the data access layer.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isPublicAdmin = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/reset-password");
    const hasCookie = SESSION_COOKIES.some((c) => req.cookies.has(c));
    if (!isPublicAdmin && !hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    const res = NextResponse.next();
    if (req.cookies.get("lb_locale")?.value !== first) {
      res.cookies.set("lb_locale", first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except API, media, Next internals, metadata files and static files with an extension.
    "/((?!api|media|_next|sitemap\.xml|robots\.txt|manifest\.webmanifest|favicon\.ico|.*\.[a-zA-Z0-9]{2,5}$).*)",
  ],
};
