import type { ReactNode } from "react";
import type { ReservationStatus } from "@/lib/reservation-status";

export const statusLabels: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  declined: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
};

/** Status colours are reserved for state, always paired with a text label and a glyph. */
const statusStyles: Record<ReservationStatus, { cls: string; glyph: string }> = {
  pending: { cls: "bg-[#fff6e0] text-[#8a5a00] border-[#f1dca8]", glyph: "◷" },
  confirmed: { cls: "bg-[#eaf6ef] text-[#1f6f43] border-[#c6e6d2]", glyph: "✓" },
  declined: { cls: "bg-[#fdf1ef] text-[#b42318] border-[#f2c7c2]", glyph: "✕" },
  cancelled: { cls: "bg-[#f2f1ee] text-[#5f5950] border-[#dedad2]", glyph: "⊘" },
  completed: { cls: "bg-[#eef2f8] text-[#2c4a7a] border-[#d3deef]", glyph: "●" },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = statusStyles[status];
  return (
    <span className={`a-badge ${s.cls}`}>
      <span aria-hidden="true">{s.glyph}</span>
      {statusLabels[status]}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="a-h1">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, href }: { label: string; value: number | string; hint?: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium text-stone">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </>
  );
  return href ? (
    <a href={href} className="a-card block p-5 transition-colors hover:border-champagne">{inner}</a>
  ) : (
    <div className="a-card p-5">{inner}</div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "error"; children: ReactNode }) {
  const cls = {
    info: "border-[#e8e3d9] bg-white",
    warning: "border-[#f1dca8] bg-[#fff9ec]",
    success: "border-[#c6e6d2] bg-[#eff8f2]",
    error: "border-[#f2c7c2] bg-[#fdf1ef]",
  }[tone];
  return <div className={`rounded border px-4 py-3 text-sm ${cls}`} role={tone === "error" ? "alert" : undefined}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="a-card flex flex-col items-center justify-center p-12 text-center">
      <span className="ornament text-champagne" aria-hidden="true" />
      <p className="mt-4 font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-stone">{children}</div>}
    </div>
  );
}
