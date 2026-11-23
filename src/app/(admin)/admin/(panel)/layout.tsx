import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { can, requireAdmin } from "@/server/auth/dal";
import { Sidebar, type NavEntry } from "@/components/admin/Sidebar";
import { RealtimeBridge } from "@/components/admin/Realtime";
import { NotificationBell } from "@/components/admin/PushToggle";
import { env, pushConfigured } from "@/server/env";
import { logoutAction } from "@/app/(admin)/admin/login/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  let pending = 0;
  if (can(user, "reservations.view")) {
    const [r] = await db()
      .select({ n: sql<number>`count(*)` })
      .from(schema.reservations)
      .where(eq(schema.reservations.status, "pending"));
    pending = r.n;
  }

  const items: (NavEntry & { show: boolean })[] = [
    { href: "/admin", label: "Tableau de bord", show: true },
    { href: "/admin/reservations", label: "Réservations", badge: pending, show: can(user, "reservations.view"), section: "Activité" },
    { href: "/admin/suites", label: "Suites", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/content/restaurants", label: "Restaurants & bars", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/content/spa", label: "Spa", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/content/experiences", label: "Expériences", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/content/events", label: "Événements", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/content/testimonials", label: "Témoignages", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/gallery", label: "Galerie", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/pages", label: "Pages & SEO", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/translations", label: "Traductions", show: can(user, "content.manage"), section: "Contenus" },
    { href: "/admin/media", label: "Médiathèque", show: can(user, "media.manage"), section: "Contenus" },
    { href: "/admin/settings", label: "Coordonnées & WhatsApp", show: can(user, "settings.manage"), section: "Configuration" },
    { href: "/admin/users", label: "Utilisateurs", show: can(user, "users.manage"), section: "Configuration" },
    { href: "/admin/audit", label: "Journal d’activité", show: can(user, "audit.view"), section: "Configuration" },
  ];

  return (
    <div className="lg:flex">
      <Sidebar
        items={items.filter((i) => i.show).map((i) => ({ href: i.href, label: i.label, badge: i.badge, section: i.section }))}
        user={{ name: user.name, role: user.roleName }}
        logout={
          <form action={logoutAction}>
            <button className="text-ivory/60 underline underline-offset-4 hover:text-white">Se déconnecter</button>
          </form>
        }
      />
      <div className="min-w-0 flex-1">
        <div className="flex h-12 items-center justify-end gap-4 border-b border-[#e8e3d9] bg-white/60 px-6">
          {can(user, "reservations.view") && pushConfigured() && (
            <NotificationBell vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? env().VAPID_PUBLIC_KEY} />
          )}
          {can(user, "reservations.view") && <RealtimeBridge />}
          <a href="/fr" target="_blank" className="text-xs text-stone underline underline-offset-4">Voir le site ↗</a>
        </div>
        <div className="mx-auto max-w-[1400px] p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
