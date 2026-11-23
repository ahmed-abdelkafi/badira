import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { VerifyForm } from "@/components/admin/auth-forms";
import { getSession } from "@/server/auth/dal";

export const metadata = { title: "Vérification" };

export default async function VerifyPage({ searchParams }: PageProps<"/admin/login/verify">) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.twoFactorVerified) redirect("/admin");
  if (!session.user.twoFactorEnabled) redirect("/admin/login/setup-2fa");
  const { next } = await searchParams;
  return (
    <AuthShell
      title="Double authentification"
      subtitle="Saisissez le code affiché par Google Authenticator, Microsoft Authenticator ou votre application TOTP."
    >
      <VerifyForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
