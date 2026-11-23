"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/site/Wordmark";

export type NavEntry = { href: string; label: string; badge?: number; section?: string };

export function Sidebar({ items, user, logout }: { items: NavEntry[]; user: { name: string; role: string }; logout: React.ReactNode }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item, i) => {
          const header = item.section && item.section !== items[i - 1]?.section ? item.section : null;
          return (
            <li key={item.href}>
              {header && <p className="mb-1 mt-5 px-3 text-[0.65rem] font-medium tracking-[0.12em] text-sand/50 uppercase">{header}</p>}
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex items-center justify-between rounded px-3 py-2 text-[0.84rem] transition-colors ${isActive(item.href) ? "bg-white/10 text-white" : "text-ivory/70 hover:bg-white/5 hover:text-white"}`}
              >
                {item.label}
                {item.badge ? <span className="rounded-full bg-champagne px-1.5 text-[0.68rem] font-semibold text-charcoal">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-4 text-xs">
      <Link href="/admin/account" className="block text-ivory/90 hover:text-white">{user.name}</Link>
      <p className="text-ivory/50">{user.role}</p>
      <div className="mt-3">{logout}</div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-charcoal px-4 text-ivory lg:hidden">
        <button type="button" aria-expanded={open} aria-controls="admin-drawer" onClick={() => setOpenFor(open ? null : pathname)} className="text-sm">
          {open ? "Fermer" : "Menu"}
        </button>
        <Wordmark className="h-4 w-auto" />
        <span className="w-10" />
      </div>
      {open && (
        <div id="admin-drawer" className="fixed inset-0 top-14 z-40 flex flex-col bg-charcoal text-ivory lg:hidden">
          {nav}
          {footer}
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-charcoal text-ivory lg:flex">
        <Link href="/admin" className="flex h-16 items-center px-6 text-sand">
          <Wordmark className="h-4 w-auto" />
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
