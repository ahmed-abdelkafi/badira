import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { PageHeader } from "@/components/admin/ui";
import { CreateUserForm, UserOps } from "@/components/admin/ConfigForms";
import { permissions } from "@/server/auth/permissions";

export const metadata = { title: "Utilisateurs" };

const permLabels: Record<string, string> = {
  "reservations.view": "Voir les réservations",
  "reservations.manage": "Traiter les réservations",
  "content.manage": "Gérer les contenus",
  "media.manage": "Gérer les médias",
  "settings.manage": "Paramètres",
  "users.manage": "Utilisateurs",
  "audit.view": "Journal",
};

export default async function UsersPage() {
  const me = await requireAdmin("users.manage");
  const [users, roles] = await Promise.all([
    db()
      .select({ u: schema.adminUsers, roleName: schema.roles.name, twoFa: schema.twoFactorAuth.enabledAt })
      .from(schema.adminUsers)
      .innerJoin(schema.roles, eq(schema.roles.key, schema.adminUsers.roleKey))
      .leftJoin(schema.twoFactorAuth, eq(schema.twoFactorAuth.userId, schema.adminUsers.id))
      .orderBy(asc(schema.adminUsers.name)),
    db().select().from(schema.roles).orderBy(asc(schema.roles.name)),
  ]);
  const roleOptions = roles.map((r) => ({ key: r.key, name: r.name }));

  return (
    <>
      <PageHeader title="Utilisateurs" description="Comptes du personnel. La double authentification est obligatoire pour tous." />
      <section className="a-card mb-6 p-5">
        <h2 className="a-h2 mb-3">Inviter un membre du personnel</h2>
        <CreateUserForm roles={roleOptions} />
      </section>

      <div className="space-y-3">
        {users.map(({ u, roleName, twoFa }) => (
          <article key={u.id} className={`a-card p-4 ${u.isActive ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{u.name} {u.id === me.id && <span className="text-xs text-stone">(vous)</span>}</p>
                <p className="text-xs text-stone">{u.email} · {roleName} · {twoFa ? "2FA ✓" : "2FA non configurée"} · {u.isActive ? "Actif" : "Désactivé"}</p>
                <p className="text-xs text-stone">Dernière connexion : {u.lastLoginAt ? u.lastLoginAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" }) : "jamais"}</p>
              </div>
            </div>
            <div className="mt-3">
              <UserOps id={u.id} isActive={u.isActive} roleKey={u.roleKey} roles={roleOptions} self={u.id === me.id} />
            </div>
          </article>
        ))}
      </div>

      <section className="a-card mt-8 overflow-x-auto p-5">
        <h2 className="a-h2 mb-3">Rôles et permissions</h2>
        <table className="a-table">
          <thead>
            <tr><th>Rôle</th>{permissions.map((p) => <th key={p} className="text-center">{permLabels[p]}</th>)}</tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.key}>
                <td className="font-medium">{r.name}</td>
                {permissions.map((p) => <td key={p} className="text-center">{r.permissions.includes(p) ? "✓" : "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
