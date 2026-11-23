import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { routes } from "@/i18n/routes";
import { getGallery, getPage } from "@/server/content/queries";
import { cmsPageMetadata } from "@/server/content/page-meta";
import { PageHero } from "@/components/site/PageHero";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { t } from "@/lib/localized";

export async function generateMetadata({ params }: PageProps<"/[lang]/gallery">) {
  const { lang } = await params;
  return cmsPageMetadata(lang, "gallery", routes.gallery, async (l) => {
    const d = await getDictionary(l);
    return { title: d.gallery.title, description: d.gallery.lead };
  });
}

export default async function GalleryPage({ params }: PageProps<"/[lang]/gallery">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, page, gallery] = await Promise.all([getDictionary(lang), getPage("gallery"), getGallery()]);
  const items = gallery.map((g) => ({
    id: g.id,
    category: g.category,
    src: g.image.src,
    width: g.image.width,
    height: g.image.height,
    blur: g.image.blur,
    alt: t(g.image.alt, lang),
    caption: t(g.caption, lang),
  }));

  return (
    <>
      <PageHero locale={lang} image={page.hero} eyebrow="La Badira" title={dict.gallery.title} lead={dict.gallery.lead} short />
      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <GalleryGrid
            items={items}
            labels={{
              all: dict.gallery.all,
              close: dict.gallery.close,
              previous: dict.common.previous,
              next: dict.common.next,
              of: dict.common.of,
              categories: dict.gallery.categories,
            }}
          />
        </div>
      </section>
    </>
  );
}
