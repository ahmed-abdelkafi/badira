"use client";

import { useId, useState } from "react";

/**
 * Single-series bar chart (magnitude → one hue, no legend; the title names it).
 * Colour #9C6B22 validated with the dataviz checks against white (chroma ≥ 0.10,
 * contrast ≥ 3:1). Thin bars, 4px rounded data-ends on the baseline, 2px gaps,
 * recessive grid, hover tooltip with hit targets larger than the mark, and a
 * table view for screen readers / exact values.
 */
const BAR = "#9C6B22";

export function BarChart({
  title,
  data,
  orientation = "vertical",
  valueLabel = "demandes",
  height = 180,
}: {
  title: string;
  data: { label: string; value: number; fullLabel?: string }[];
  orientation?: "vertical" | "horizontal";
  valueLabel?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];

  return (
    <figure className="a-card p-5" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="a-h2">{title}</figcaption>

      {orientation === "vertical" ? (
        <div className="relative mt-5" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-[#f0ece4]" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -top-2 end-full me-2 text-[0.65rem] tabular-nums text-stone">{t}</span>
            </div>
          ))}
          <div className="absolute inset-0 ms-6 flex items-end gap-[2px]" role="img" aria-label={`${title} — graphique`}>
            {data.map((d, i) => (
              <div
                key={i}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={-1}
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 2 : 0, background: BAR, opacity: hover === null || hover === i ? 1 : 0.45 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-charcoal px-2 py-1 text-xs text-white shadow">
                    <span className="text-white/70">{d.fullLabel ?? d.label}</span> · <strong className="tabular-nums">{d.value}</strong> {valueLabel}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-5 space-y-[6px]" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <li key={i} className="grid grid-cols-[minmax(7rem,10rem)_1fr_2.5rem] items-center gap-3 text-xs" onMouseEnter={() => setHover(i)}>
              <span className="truncate text-stone" title={d.fullLabel ?? d.label}>{d.label}</span>
              <span className="h-3 rounded-e-[4px]" style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value ? 2 : 0, background: BAR, opacity: hover === null || hover === i ? 1 : 0.45 }} />
              <span className="text-end tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      )}

      {orientation === "vertical" && data.length > 0 && (
        <div className="ms-6 mt-2 flex justify-between text-[0.65rem] text-stone">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-stone">Voir les données</summary>
        <table className="a-table mt-2">
          <thead>
            <tr><th scope="col">Libellé</th><th scope="col" className="text-end">Valeur</th></tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}><td>{d.fullLabel ?? d.label}</td><td className="text-end tabular-nums">{d.value}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 5 / 10) * 10;
  const out = [];
  for (let v = 0; v <= max + step - 1; v += step) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
