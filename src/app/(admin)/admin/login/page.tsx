import { redirect } from "next/navigation";
import { AuthShell } from "@/components/admin/AuthShell";
import { LoginForm } from "@/components/admin/auth-forms";
import { getSession } from "@/server/auth/dal";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const session = await getSession();
  if (session?.twoFactorVerified) redirect("/admin");
  const { next } = await searchParams;
  return (
    <AuthShell title="Connexion" subtitle="Espace d’administration de La Badira">
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
