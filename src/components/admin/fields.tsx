"use client";

import Image from "next/image";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Localized } from "@/lib/localized";

const LOCALES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
] as const;

/**
 * Trilingual input: all three locales are rendered (and submitted) as
 * `${name}.fr|en|ar`; tabs only change which one is visible. A dot marks
 * locales that already have content.
 */
export function LocalizedField({
  name,
  label,
  value,
  multiline = false,
  rows = 4,
  maxLength,
  hint,
  list = false,
}: {
  name: string;
  label: string;
  value?: Localized | Localized[];
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
  /** One item per line (amenities, features). */
  list?: boolean;
}) {
  const [active, setActive] = useState<"fr" | "en" | "ar">("fr");
  const initial = (l: "fr" | "en" | "ar") =>
    Array.isArray(value) ? value.map((v) => v[l] ?? "").join("\n") : ((value as Localized | undefined)?.[l] ?? "");
  const [filled, setFilled] = useState(() => Object.fromEntries(LOCALES.map((l) => [l.code, !!initial(l.code).trim()])));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="a-label !mb-0">{label}</span>
        <div role="tablist" aria-label={`${label} — langue`} className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="tab"
              aria-selected={active === l.code}
              onClick={() => setActive(l.code)}
              className={`rounded px-2 py-0.5 text-[0.7rem] font-medium ${active === l.code ? "bg-charcoal text-white" : "bg-[#f0ece4] text-stone"}`}
            >
              {l.label}
              {filled[l.code] && <span className="ms-1 inline-block h-1 w-1 rounded-full bg-champagne align-middle" aria-label="rempli" />}
            </button>
          ))}
        </div>
      </div>
      {LOCALES.map((l) => {
        const common = {
          name: `${name}.${l.code}`,
          defaultValue: initial(l.code),
          maxLength,
          dir: l.code === "ar" ? ("rtl" as const) : ("ltr" as const),
          lang: l.code,
          "aria-label": `${label} (${l.label})`,
          className: `a-input ${active === l.code ? "" : "hidden"}`,
          onChange: (e: { target: { value: string } }) => setFilled((f) => ({ ...f, [l.code]: !!e.target.value.trim() })),
        };
        return multiline || list ? <textarea key={l.code} rows={list ? Math.max(rows, 3) : rows} {...common} /> : <input key={l.code} {...common} />;
      })}
      {(hint || list) && <p className="mt-1 text-xs text-stone">{hint ?? "Un élément par ligne ; les lignes sont alignées entre les langues."}</p>}
    </div>
  );
}

export type MediaOption = { id: string; src: string; alt: string; width: number; height: number; category: string };

/** Choose one image from the media library (or none). */
export function MediaPicker({ name, label, media, value, allowNone = true }: { name: string; label: string; media: MediaOption[]; value?: string | null; allowNone?: boolean }) {
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const [open, setOpen] = useState(false);
  const current = media.find((m) => m.id === selected);
  return (
    <div>
      <span className="a-label">{label}</span>
      <input type="hidden" name={name} value={selected ?? ""} />
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-24 overflow-hidden rounded border border-[#e8e3d9] bg-[#f3efe7]">
          {current ? <Image src={current.src} alt={current.alt} fill sizes="96px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] text-stone">Aucune</span>}
        </div>
        <button type="button" className="a-btn a-btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Fermer" : "Choisir"}
        </button>
        {allowNone && selected && (
          <button type="button" className="a-btn a-btn-sm" onClick={() => setSelected(null)}>Retirer</button>
        )}
      </div>
      {open && (
        <div className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded border border-[#e8e3d9] bg-white p-2 sm:grid-cols-5" role="listbox" aria-label={label}>
          {media.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={m.id === selected}
              onClick={() => {
                setSelected(m.id);
                setOpen(false);
              }}
              className={`relative aspect-[4/3] overflow-hidden rounded border-2 ${m.id === selected ? "border-champagne" : "border-transparent"}`}
              title={m.alt}
            >
              <Image src={m.src} alt={m.alt} fill sizes="120px" className="object-cover" />
            </button>
          ))}
          {media.length === 0 && <p className="col-span-full p-4 text-sm text-stone">La médiathèque est vide.</p>}
        </div>
      )}
    </div>
  );
}

export function SubmitButton({ children, className = "a-btn a-btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

export function Feedback({ state }: { state: { ok?: boolean; error?: string; message?: string } }) {
  if (state.error) return <p role="alert" className="rounded border border-[#f2c7c2] bg-[#fdf1ef] px-3 py-2 text-sm text-[#b42318]">{state.error}</p>;
  if (state.ok && state.message) return <p role="status" className="rounded border border-[#c6e6d2] bg-[#eff8f2] px-3 py-2 text-sm">{state.message}</p>;
  return null;
}
