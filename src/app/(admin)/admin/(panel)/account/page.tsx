import { requireAdmin } from "@/server/auth/dal";
import { countUnusedRecoveryCodes } from "@/server/auth/service";
import { listSubscriptions } from "@/server/notifications/push";
import { env, pushConfigured } from "@/server/env";
import { PageHeader } from "@/components/admin/ui";
import { ChangePasswordForm, RegenerateCodesForm } from "@/components/admin/AccountForms";
import { PushToggle } from "@/components/admin/PushToggle";
import { removeDeviceAction, signOutEverywhereAction } from "./actions";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireAdmin();
  const [codes, devices] = await Promise.all([countUnusedRecoveryCodes(user.id), listSubscriptions(user.id)]);

  return (
    <>
      <PageHeader title="Mon compte" description={`${user.name} · ${user.email} · ${user.roleName}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="a-card p-5" aria-labelledby="notif">
          <h2 id="notif" className="a-h2">Notifications du navigateur</h2>
          <p className="mt-1 mb-4 text-sm text-stone">Recevez une alerte pour chaque nouvelle demande, même lorsque le tableau de bord est fermé.</p>
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? env().VAPID_PUBLIC_KEY} serverReady={pushConfigured()} />
          {devices.length > 0 && (
            <ul className="mt-5 divide-y divide-[#f0ece4] border-t border-[#f0ece4] text-sm">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{d.userAgent ?? "Appareil inconnu"}</span>
                    <span className="text-xs text-stone">
                      Ajouté le {d.createdAt.toLocaleDateString("fr-FR")}
                      {d.lastSuccessAt ? ` · dernier envoi ${d.lastSuccessAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}` : ""}
                    </span>
                  </span>
                  <form action={removeDeviceAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="a-btn a-btn-sm">Retirer</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="a-card p-5" aria-labelledby="twofa">
          <h2 id="twofa" className="a-h2">Double authentification</h2>
          <p className="mt-1 text-sm">
            {user.twoFactorEnabled ? <span className="text-[#1f6f43]">✓ Activée (TOTP)</span> : "Non activée"} · codes de récupération restants : <strong>{codes}</strong>
          </p>
          {codes <= 3 && <p className="mt-2 text-sm text-[#8a5a00]">Il vous reste peu de codes de récupération : générez-en de nouveaux.</p>}
          <div className="mt-4"><RegenerateCodesForm /></div>
          <p className="mt-4 text-xs text-stone">Téléphone perdu ? Connectez-vous avec un code de récupération, ou demandez à un propriétaire de réinitialiser votre double authentification.</p>
        </section>

        <section className="a-card p-5" aria-labelledby="pwd">
          <h2 id="pwd" className="a-h2">Mot de passe</h2>
          <div className="mt-4"><ChangePasswordForm email={user.email} /></div>
        </section>

        <section className="a-card p-5" aria-labelledby="sessions">
          <h2 id="sessions" className="a-h2">Sessions</h2>
          <p className="mt-1 mb-4 text-sm text-stone">Ferme toutes vos sessions ouvertes, y compris celle-ci.</p>
          <form action={signOutEverywhereAction}>
            <button className="a-btn a-btn-danger">Se déconnecter partout</button>
          </form>
        </section>
      </div>
    </>
  );
}
