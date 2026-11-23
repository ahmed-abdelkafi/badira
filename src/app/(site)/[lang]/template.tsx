"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Re-mounts on every navigation: fades the new page in (never on the first,
 * server-rendered load) and refreshes scroll-linked animations.
 */
/** True until the first page has mounted: no fade on the initial (SSR) load. */
let firstLoad = true;

export default function SiteTemplate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [animateIn] = useState(() => !firstLoad && !reduced);

  useEffect(() => {
    firstLoad = false;
    // New route: jump to top, then let GSAP recompute pinned sections.
    window.__lenis?.scrollTo(0, { immediate: true });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={animateIn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
