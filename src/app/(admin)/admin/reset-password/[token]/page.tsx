import Link from "next/link";
import { AuthShell } from "@/components/admin/AuthShell";
import { ResetPasswordForm } from "@/components/admin/auth-forms";
import { getResetTokenEmail } from "@/server/auth/service";

export const metadata = { title: "Nouveau mot de passe", referrer: "no-referrer" as const };

export default async function ResetPasswordPage({ params }: PageProps<"/admin/reset-password/[token]">) {
  const { token } = await params;
  const email = await getResetTokenEmail(token.slice(0, 100));
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Toutes les sessions ouvertes seront fermées.">
      {email ? (
        <ResetPasswordForm token={token.slice(0, 100)} email={email} />
      ) : (
        <div className="space-y-4 text-sm">
          <p role="alert" className="rounded border border-[#f2c7c2] bg-[#fdf1ef] px-3 py-2 text-[#b42318]">Ce lien est invalide, déjà utilisé ou expiré.</p>
          <Link href="/admin/reset-password" className="a-btn w-full">Demander un nouveau lien</Link>
        </div>
      )}
    </AuthShell>
  );
}
