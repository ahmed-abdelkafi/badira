"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type GalleryItem = { id: string; category: string; src: string; width: number; height: number; blur: string | null; alt: string; caption: string };

export function GalleryGrid({
  items,
  labels,
}: {
  items: GalleryItem[];
  labels: { all: string; close: string; previous: string; next: string; of: string; categories: Record<string, string> };
}) {
  const [filter, setFilter] = useState<string>("all");
  const [index, setIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const visible = useMemo(() => (filter === "all" ? items : items.filter((i) => i.category === filter)), [items, filter]);

  const close = useCallback(() => {
    setIndex(null);
    lastTrigger.current?.focus();
  }, []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (index === null) return;
    window.__lenis?.stop();
    closeRef.current?.focus();
    const rtl = document.documentElement.dir === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
      if (e.key === "Tab" && dialogRef.current) {
        const f = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button"));
        const at = f.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
    };
  }, [index, close, step]);

  const current = index !== null ? visible[index] : null;

  return (
    <>
      <div role="tablist" aria-label="Filter" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-2">
        {["all", ...categories].map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={filter === c}
            onClick={() => setFilter(c)}
            className={`shrink-0 border px-5 py-2.5 text-[0.7rem] tracking-[0.2em] uppercase transition-colors rtl:tracking-normal ${filter === c ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/20 hover:border-charcoal"}`}
          >
            {c === "all" ? labels.all : (labels.categories[c] ?? c)}
          </button>
        ))}
      </div>

      <ul className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {visible.map((item, i) => (
          <li key={item.id} className="mb-6 break-inside-avoid">
            <button
              type="button"
              className="group relative block w-full overflow-clip text-start"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setIndex(i);
              }}
              aria-label={item.alt || item.caption}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                {...(item.blur ? { placeholder: "blur" as const, blurDataURL: item.blur } : {})}
              />
              {item.caption && <span className="mt-3 block text-xs text-stone">{item.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {current && (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={current.caption || current.alt}
            className="fixed inset-0 z-[70] flex flex-col bg-charcoal/97 text-ivory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            data-lenis-prevent
          >
            <div className="flex items-center justify-between px-6 py-5 text-xs tracking-[0.2em] uppercase rtl:tracking-normal">
              <span aria-live="polite">
                {index! + 1} {labels.of} {visible.length}
              </span>
              <button ref={closeRef} type="button" onClick={close} className="link-draw">
                {labels.close}
              </button>
            </div>
            <div className="relative flex-1">
              <AnimatePresence mode="wait">
                <motion.div key={current.id} className="absolute inset-4 md:inset-10" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                  <Image src={current.src} alt={current.alt} fill sizes="100vw" quality={85} className="object-contain" />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-5">
              <button type="button" onClick={() => step(-1)} className="link-draw text-xs tracking-[0.2em] uppercase rtl:tracking-normal">
                ← {labels.previous}
              </button>
              <p className="hidden text-center text-sm text-ivory/70 md:block">{current.caption}</p>
              <button type="button" onClick={() => step(1)} className="link-draw text-xs tracking-[0.2em] uppercase rtl:tracking-normal">
                {labels.next} →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
