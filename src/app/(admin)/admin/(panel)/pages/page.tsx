import Link from "next/link";
import { requireAdmin } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { listMediaOptions } from "@/server/services/admin-helpers";
import { PAGE_KEYS, PAGE_LABELS, type PageKey } from "@/server/services/pages-config";
import { PageHeader } from "@/components/admin/ui";
import { PageForm } from "@/components/admin/PageForm";

export const metadata = { title: "Pages & SEO" };

export default async function PagesAdminPage({ searchParams }: PageProps<"/admin/pages">) {
  await requireAdmin("content.manage");
  const { key: rawKey } = await searchParams;
  const key: PageKey = (PAGE_KEYS as readonly string[]).includes(String(rawKey)) ? (rawKey as PageKey) : "home";
  const [rows, media] = await Promise.all([db().select().from(schema.pages), listMediaOptions()]);
  const page = rows.find((r) => r.key === key);

  return (
    <>
      <PageHeader title="Pages & SEO" description="Titres et descriptions pour Google, images d’en-tête et de partage, sections de l’accueil." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Pages" className="a-card h-fit p-2">
          <ul>
            {PAGE_KEYS.map((k) => (
              <li key={k}>
                <Link href={`/admin/pages?key=${k}`} aria-current={k === key ? "page" : undefined} className={`block rounded px-3 py-2 text-sm ${k === key ? "bg-charcoal text-white" : "hover:bg-[#f3efe7]"}`}>
                  {PAGE_LABELS[k].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <section className="a-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="a-h2">{PAGE_LABELS[key].label}</h2>
            <a href={`/fr${PAGE_LABELS[key].path}`} target="_blank" className="a-btn a-btn-sm">Prévisualiser ↗</a>
          </div>
          <PageForm
            key={key}
            pageKey={key}
            seoTitle={page?.seoTitle ?? {}}
            seoDescription={page?.seoDescription ?? {}}
            heroImageId={page?.heroImageId ?? null}
            ogImageId={page?.ogImageId ?? null}
            sections={page?.sections ?? {}}
            media={media}
          />
        </section>
      </div>
    </>
  );
}
