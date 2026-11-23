import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Img } from "@/server/content/queries";
import { Picture } from "./Picture";
import { Parallax } from "./motion";
import { SplitHeading } from "./SplitHeading";

/** Inner-page hero: tall image with parallax, editorial title bottom-left. */
export function PageHero({
  locale,
  image,
  eyebrow,
  title,
  lead,
  children,
  short = false,
}: {
  locale: Locale;
  image: Img | null;
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  short?: boolean;
}) {
  return (
    <section className={`relative overflow-clip bg-charcoal text-ivory ${short ? "h-[62svh] min-h-[460px]" : "h-[86svh] min-h-[560px]"}`}>
      {image && (
        <Parallax amount={18} className="absolute inset-0">
          <Picture img={image} locale={locale} sizes="100vw" priority quality={85} className="object-cover" />
        </Parallax>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,28,28,.5)_0%,rgba(28,28,28,.15)_40%,rgba(28,28,28,.8)_100%)]" aria-hidden="true" />
      <div className="container-luxe relative flex h-full flex-col justify-end pb-14 md:pb-20">
        {eyebrow && <p className="eyebrow mb-6 text-sand">{eyebrow}</p>}
        <SplitHeading as="h1" text={title} className="display display-xl max-w-5xl text-balance" />
        {lead && <p className="lede mt-8 max-w-2xl text-ivory/85">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
