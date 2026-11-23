"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------------------------------------------ */
/* Cinematic hero: entrance timeline + scroll-out parallax             */
/* ------------------------------------------------------------------ */

export function CinematicHero({ media, children }: { media: ReactNode; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo("[data-hero-media]", { scale: 1.18 }, { scale: 1.04, duration: 3.2, ease: "power2.out" }, 0)
        .fromTo("[data-hero-veil]", { opacity: 1 }, { opacity: 0, duration: 1.6, ease: "power2.inOut" }, 0)
        .fromTo("[data-hero-letter]", { yPercent: 110 }, { yPercent: 0, duration: 1.6, stagger: 0.06 }, 0.5)
        .fromTo("[data-hero-line]", { yPercent: 105 }, { yPercent: 0, duration: 1.4, stagger: 0.12 }, 1.1)
        .fromTo("[data-hero-fade]", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 1.5);

      gsap.to("[data-hero-media]", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to("[data-hero-content]", {
        yPercent: -30,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "70% top", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-clip bg-charcoal text-ivory">
      <div data-hero-media className="absolute inset-0 will-change-transform">
        {media}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,28,28,.55)_0%,rgba(28,28,28,.2)_35%,rgba(28,28,28,.45)_60%,rgba(28,28,28,.85)_100%)]" aria-hidden="true" />
      <div data-hero-veil className="pointer-events-none absolute inset-0 bg-charcoal opacity-0" aria-hidden="true" />
      <div data-hero-content className="relative z-10 h-full">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax: translate a child at a fraction of scroll speed           */
/* ------------------------------------------------------------------ */

export function Parallax({ children, amount = 12, className = "" }: { children: ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.firstElementChild,
        { yPercent: -amount / 2 },
        { yPercent: amount / 2, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }, el);
    return () => ctx.revert();
  }, [amount]);
  return (
    <div ref={ref} className={`overflow-clip ${className}`}>
      <div className="h-full w-full scale-[1.15] will-change-transform">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scale-in: image grows from inset to full-bleed as it scrolls in     */
/* ------------------------------------------------------------------ */

export function ScaleReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: "inset(12% 14% 12% 14%)" },
        { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: el, start: "top 90%", end: "center center", scrub: 0.6 } },
      );
      gsap.fromTo(el.firstElementChild, { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className={`overflow-clip ${className}`}>
      <div className="relative h-full w-full will-change-transform">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pinned horizontal track (desktop); native swipe on touch/mobile      */
/* ------------------------------------------------------------------ */

export function HorizontalTrack({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = wrap.current;
    const tr = track.current;
    if (!el || !tr || reducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (pointer: fine)", () => {
      const rtl = document.documentElement.dir === "rtl";
      const distance = () => Math.max(0, tr.scrollWidth - el.clientWidth);
      gsap.to(tr, {
        x: () => (rtl ? distance() : -distance()),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={wrap} className={`overflow-clip ${className}`} role="region" aria-label={label}>
      <div
        ref={track}
        className="no-scrollbar flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-[clamp(1.25rem,5vw,5rem)] lg:w-max lg:snap-none lg:overflow-visible lg:[@media(pointer:coarse)]:w-full lg:[@media(pointer:coarse)]:overflow-x-auto"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section indicator: fixed rail showing the active homepage chapter   */
/* ------------------------------------------------------------------ */

export function SectionIndicator({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = els.indexOf(e.target as HTMLElement);
            if (idx > -1) setActive(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <nav
      aria-label="Sections"
      className={`fixed end-6 top-1/2 z-30 hidden -translate-y-1/2 mix-blend-difference transition-opacity duration-700 xl:block ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <ol className="flex flex-col items-end gap-3">
        {sections.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => go(s.id)} className="group flex items-center gap-3 text-ivory" aria-label={s.label} aria-current={i === active ? "true" : undefined}>
              <span className={`text-[0.6rem] tracking-[0.25em] uppercase transition-all duration-500 rtl:tracking-normal translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-90 group-focus-visible:translate-x-0 group-focus-visible:opacity-90`}>
                {s.label}
              </span>
              <span className={`block h-px bg-current transition-all duration-500 ${i === active ? "w-10" : "w-4 opacity-50 group-hover:w-6"}`} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky story: text pinned while images scroll; active step fades    */
/* ------------------------------------------------------------------ */

export function StickySteps({ steps, media }: { steps: ReactNode[]; media: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Mobile / tablet: simple interleaved flow */}
      <div className="space-y-12 lg:hidden">
        {steps.map((s, i) => (
          <div key={i} className="space-y-8">
            {s}
            {media[i]}
          </div>
        ))}
      </div>
      {/* Desktop: sticky copy, scrolling media */}
      <div className="hidden gap-10 lg:grid lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative lg:sticky lg:top-[24vh] lg:min-h-[50vh]">
            {steps.map((s, i) => (
              <div
                key={i}
                inert={i !== active}
                className={`absolute inset-x-0 top-0 transition-all duration-700 ease-[var(--ease-luxe)] ${i === active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-[18vh] lg:col-span-6 lg:col-start-7">
          {media.map((m, i) => (
            <div key={i} ref={(el) => { refs.current[i] = el; }} data-index={i}>
              {m}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
