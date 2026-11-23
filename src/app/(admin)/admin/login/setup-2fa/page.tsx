import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { SetupForm } from "@/components/admin/auth-forms";
import { getSession } from "@/server/auth/dal";
import { beginTotpSetup } from "@/server/auth/service";

export const metadata = { title: "Activer la double authentification" };

/**
 * 2FA enrolment is mandatory for every administrator. A fresh secret is
 * generated on each visit until a code is confirmed; it is stored encrypted
 * and shown only here (QR + manual key) to the signed-in user.
 */
export default async function SetupTwoFactorPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.user.twoFactorEnabled) redirect(session.twoFactorVerified ? "/admin" : "/admin/login/verify");
  const setup = await beginTotpSetup(session.user.id, session.user.email);
  const grouped = setup.secret.match(/.{1,4}/g)?.join(" ") ?? setup.secret;

  return (
    <AuthShell title="Activer la double authentification" subtitle="Obligatoire pour tous les comptes administrateur.">
      <ol className="space-y-6 text-sm">
        <li>
          <p className="font-medium">1. Scannez ce QR code</p>
          <p className="mt-1 text-stone">Avec Google Authenticator, Microsoft Authenticator ou toute application TOTP.</p>
          <div className="mt-3 inline-block rounded border border-[#e8e3d9] bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated server-side */}
            <img src={setup.qrDataUrl} alt="QR code d’enrôlement TOTP" width={200} height={200} />
          </div>
          <details className="mt-2 text-xs text-stone">
            <summary className="cursor-pointer">Saisie manuelle de la clé</summary>
            <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-charcoal">{grouped}</code>
          </details>
        </li>
        <li>
          <p className="mb-3 font-medium">2. Saisissez le code à 6 chiffres</p>
          <SetupForm />
        </li>
      </ol>
    </AuthShell>
  );
}
