import Link from "next/link";
import { requireAdmin } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { baseDictionaries } from "@/i18n/get-dictionary";
import { flatten } from "@/i18n/flatten";
import { PageHeader } from "@/components/admin/ui";
import { TranslationsForm, type TranslationRow } from "@/components/admin/ConfigForms";

export const metadata = { title: "Traductions" };

const groupLabels: Record<string, string> = {
  meta: "Référencement", nav: "Navigation", common: "Commun", home: "Accueil", concept: "Concept", suites: "Suites",
  dining: "Gastronomie", spa: "Spa", experiences: "Expériences", events: "Événements", gallery: "Galerie",
  contact: "Contact", reservation: "Réservation", privacy: "Confidentialité", footer: "Pied de page", notFound: "Page 404",
};

export default async function TranslationsPage({ searchParams }: PageProps<"/admin/translations">) {
  await requireAdmin("content.manage");
  const { group: g } = await searchParams;
  const flat = { fr: flatten(baseDictionaries.fr), en: flatten(baseDictionaries.en), ar: flatten(baseDictionaries.ar) };
  const groups = [...new Set(Object.keys(flat.fr).map((k) => k.split(".")[0]))];
  const group = typeof g === "string" && groups.includes(g) ? g : groups[0];
  const overrides = await db().select().from(schema.translations);
  const ov = new Map(overrides.map((o) => [`${o.locale}:${o.key}`, o.value]));
  const rows: TranslationRow[] = Object.keys(flat.fr)
    .filter((k) => k.startsWith(`${group}.`))
    .map((k) => ({
      key: k,
      base: { fr: flat.fr[k], en: flat.en[k] ?? "", ar: flat.ar[k] ?? "" },
      override: { fr: ov.get(`fr:${k}`), en: ov.get(`en:${k}`), ar: ov.get(`ar:${k}`) },
    }));
  const counts = Object.fromEntries(groups.map((gr) => [gr, overrides.filter((o) => o.key.startsWith(`${gr}.`)).length]));

  return (
    <>
      <PageHeader title="Traductions" description="Textes de l’interface publique en français, anglais et arabe. Les noms propres (La Badira, noms des suites…) ne se traduisent pas." />
      <nav aria-label="Groupes" className="mb-4 flex flex-wrap gap-1">
        {groups.map((gr) => (
          <Link key={gr} href={`/admin/translations?group=${gr}`} aria-current={gr === group ? "page" : undefined} className={`a-btn a-btn-sm ${gr === group ? "a-btn-primary" : ""}`}>
            {groupLabels[gr] ?? gr}
            {counts[gr] ? <span className="ms-1 rounded-full bg-champagne px-1.5 text-[0.65rem] text-charcoal">{counts[gr]}</span> : null}
          </Link>
        ))}
      </nav>
      <section className="a-card p-5">
        <TranslationsForm key={group} group={groupLabels[group] ?? group} rows={rows} />
      </section>
    </>
  );
}
