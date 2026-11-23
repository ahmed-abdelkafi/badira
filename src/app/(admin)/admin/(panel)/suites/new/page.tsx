import Link from "next/link";
import { requireAdmin } from "@/server/auth/dal";
import { PageHeader } from "@/components/admin/ui";
import { SuiteForm } from "@/components/admin/SuiteForms";

export const metadata = { title: "Nouvelle suite" };

export default async function NewSuitePage() {
  await requireAdmin("content.manage");
  return (
    <>
      <Link href="/admin/suites" className="mb-4 inline-block text-xs text-stone underline underline-offset-4">← Toutes les suites</Link>
      <PageHeader title="Nouvelle suite" description="Créée masquée par défaut : activez-la une fois les textes et photos prêts." />
      <SuiteForm
        suite={{
          slug: "",
          name: "",
          collection: "standard",
          inventoryCategory: "fell",
          status: "inactive",
          tagline: {},
          description: {},
          areaSqm: null,
          maxOccupancy: null,
          bedConfiguration: {},
          view: null,
          viewDetails: {},
          amenities: [],
          features: [],
          seoTitle: {},
          seoDescription: {},
          internalNotes: null,
        }}
      />
    </>
  );
}
