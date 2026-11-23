"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { locales, localeMeta, type Locale } from "@/i18n/config";
import { LogoMark, Wordmark } from "./Wordmark";

export type NavItem = { href: string; label: string };

type Props = {
  locale: Locale;
  items: NavItem[];
  reserve: { href: string; label: string };
  labels: { menu: string; close: string; language: string; adultsOnly: string };
  contact: { phone: string; email: string; address: string };
  homeHref: string;
};

export function Header({ locale, items, reserve, labels, contact, homeHref }: Props) {
  const pathname = usePathname();
  // The menu is "open for" a pathname: navigating elsewhere closes it implicitly.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor !== null && openFor === pathname;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) =>
    setOpenFor((prev) => {
      const next = typeof v === "function" ? v(prev !== null && prev === pathname) : v;
      return next ? pathname : null;
    });
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 400 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll lock, Escape to close, focus management.
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
      if (e.key === "Tab" && panelRef.current) {
        const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"));
        if (!f.length) return;
        const [a, b] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const toggle = toggleRef.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
      document.body.style.overflow = "";
      toggle?.focus();
    };
  }, [open]);

  const swapLocale = (l: Locale) => (pathname ? pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, `/${l}`) : `/${l}`);
  // Pages without a dark hero image need the solid (dark-on-ivory) header from the top.
  const knownHeroPage = /^\/(fr|en|ar)(\/(concept|suites(\/[a-z0-9-]+)?|dining|spa|experiences|events|gallery|contact))?\/?$/.test(pathname ?? "");
  const solid = (scrolled || !knownHeroPage) && !open;

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,height] duration-700 ease-[var(--ease-luxe)]",
          solid ? "bg-ivory/92 text-charcoal backdrop-blur-md" : "bg-transparent text-ivory",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
        ].join(" ")}
      >
        <div className={`container-luxe flex items-center justify-between transition-[height] duration-700 ${solid ? "h-16 md:h-20" : "h-20 md:h-28"}`}>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="group flex items-center gap-4 py-3 text-[0.7rem] tracking-[0.3em] uppercase rtl:tracking-normal rtl:text-sm"
          >
            <span className="relative block h-3 w-8" aria-hidden="true">
              <span className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-500 ${open ? "translate-y-1.5 rotate-45" : "group-hover:translate-x-1 rtl:group-hover:-translate-x-1"}`} />
              <span className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-500 ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
            </span>
            <span className="hidden sm:inline">{open ? labels.close : labels.menu}</span>
          </button>

          <Link href={homeHref} aria-label="La Badira" className="absolute start-1/2 flex -translate-x-1/2 items-center gap-3 rtl:translate-x-1/2">
            <LogoMark className={`hidden w-auto transition-all duration-700 sm:block ${solid ? "h-7" : "h-9"}`} title="" />
            <Wordmark className={`w-auto transition-all duration-700 ${solid ? "h-3.5 sm:h-5 md:h-6" : "h-3.5 sm:h-6 md:h-8"}`} />
          </Link>

          <div className="flex items-center gap-6">
            <nav aria-label={labels.language} className="hidden items-center gap-3 text-[0.7rem] tracking-[0.2em] md:flex">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={swapLocale(l)}
                  hrefLang={localeMeta[l].hreflang}
                  lang={l}
                  aria-current={l === locale ? "true" : undefined}
                  className={l === locale ? "opacity-100" : "opacity-55 transition-opacity hover:opacity-100"}
                >
                  {localeMeta[l].short}
                </Link>
              ))}
            </nav>
            <Link href={reserve.href} className={`btn ${solid ? "btn-dark" : "btn-light"} !px-3 !py-2 !text-[0.62rem] sm:!px-4 sm:!py-2.5 sm:!text-[0.72rem] md:!px-6 md:!py-3`}>
              {reserve.label}
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={labels.menu}
            className="fixed inset-0 z-40 overflow-y-auto bg-charcoal text-ivory"
            initial={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.9, ease: [0.77, 0, 0.175, 1] }}
            data-lenis-prevent
          >
            <div className="container-luxe grid min-h-full gap-16 pb-16 pt-32 md:grid-cols-12 md:pt-40">
              <nav aria-label="Navigation" className="md:col-span-7">
                <ul className="space-y-1">
                  {items.map((item, i) => {
                    const active = pathname === item.href || (item.href !== homeHref && pathname?.startsWith(item.href));
                    return (
                      <motion.li
                        key={item.href}
                        initial={reduced ? false : { y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.35 + i * 0.05, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className="group flex items-baseline gap-5 py-1.5"
                        >
                          <span className="w-8 font-sans text-[0.65rem] tracking-[0.2em] text-sand/60">{String(i + 1).padStart(2, "0")}</span>
                          <span className={`display text-[clamp(2rem,4.4vw,3.6rem)] transition-[color,transform] duration-500 group-hover:translate-x-3 group-hover:text-champagne rtl:group-hover:-translate-x-3 ${active ? "text-champagne" : ""}`}>
                            {item.label}
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>
              <motion.aside
                className="flex flex-col justify-end gap-10 border-sand/15 md:col-span-4 md:col-start-9 md:border-s md:ps-10"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                <div className="flex gap-5 md:hidden">
                  {locales.map((l) => (
                    <Link key={l} href={swapLocale(l)} lang={l} hrefLang={localeMeta[l].hreflang} aria-current={l === locale ? "true" : undefined} className={`text-sm ${l === locale ? "text-champagne" : "text-ivory/70"}`}>
                      {localeMeta[l].label}
                    </Link>
                  ))}
                </div>
                <p className="eyebrow text-sand/70">{labels.adultsOnly}</p>
                <address className="space-y-2 text-sm not-italic text-ivory/80">
                  <p>{contact.address}</p>
                  <p>
                    <a className="link-draw" href={`tel:${contact.phone}`} dir="ltr">{contact.phone}</a>
                  </p>
                  <p>
                    <a className="link-draw" href={`mailto:${contact.email}`}>{contact.email}</a>
                  </p>
                </address>
              </motion.aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
