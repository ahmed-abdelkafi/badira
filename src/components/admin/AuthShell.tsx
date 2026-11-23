import type { ReactNode } from "react";
import { Lockup, Wordmark } from "@/components/site/Wordmark";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden bg-charcoal text-sand lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Wordmark className="h-5 w-auto self-start" />
        <div>
          <Lockup className="h-auto w-72 text-ivory/90" place="ADMINISTRATION" />
        </div>
        <p className="text-xs tracking-[0.25em] text-sand/60 uppercase">Accès réservé au personnel autorisé</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 h-5 w-auto lg:hidden" />
          <h1 className="a-h1">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-stone">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
