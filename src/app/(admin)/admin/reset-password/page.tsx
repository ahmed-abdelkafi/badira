import Link from "next/link";
import { AuthShell } from "@/components/admin/AuthShell";

export const metadata = { title: "Mot de passe oublié" };

/** No email by design: an owner generates a one-time link from « Utilisateurs ». */
export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Pour des raisons de sécurité, la réinitialisation passe par un administrateur.">
      <div className="space-y-4 text-sm">
        <p>Demandez à un administrateur « Propriétaire » de générer un lien de réinitialisation depuis <strong>Utilisateurs</strong>. Il vous le transmettra personnellement (par exemple sur WhatsApp). Le lien est valable 30 minutes et ne fonctionne qu’une fois.</p>
        <p className="text-stone">Si vous avez seulement perdu votre téléphone, connectez-vous avec un code de récupération.</p>
        <Link href="/admin/login" className="a-btn w-full">Retour à la connexion</Link>
      </div>
    </AuthShell>
  );
}
