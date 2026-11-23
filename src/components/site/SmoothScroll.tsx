"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lenis smooth scrolling synchronised with GSAP's ticker.
 * Disabled entirely for users who prefer reduced motion and on touch
 * devices (native momentum scrolling is better there).
 */
export function SmoothScroll() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const reduced = prefersReducedMotion();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);

  return null;
}
