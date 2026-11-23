import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { routes } from "@/i18n/routes";
import { getContactSettings } from "@/server/content/queries";
import { pageMetadata } from "@/lib/seo";

/**
 * Factual description of what THIS website does with reservation requests.
 * It is not a full legal policy — the hotel's legal team should review it.
 */
const copy: Record<Locale, { intro: string; items: [string, string][]; contact: string }> = {
  fr: {
    intro: "Cette page décrit le traitement des informations transmises via le formulaire de demande de réservation de ce site.",
    items: [
      ["Données collectées", "Dates de séjour, nombre de personnes et de suites, suite souhaitée, prénom, nom, téléphone, e-mail (facultatif), demandes particulières, langue, date de votre consentement."],
      ["Finalité", "Étudier votre demande de réservation et vous recontacter (WhatsApp ou téléphone)."],
      ["Accès", "Uniquement le personnel autorisé de La Badira, via un espace d'administration sécurisé (authentification à deux facteurs). Chaque action est journalisée."],
      ["Partage", "Aucune vente ni cession à des tiers. Si vous êtes contacté via WhatsApp, l'échange est soumis aux conditions de WhatsApp."],
      ["Vos droits", "Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à l'adresse ci-dessous."],
    ],
    contact: "Contact",
  },
  en: {
    intro: "This page describes how information submitted through this website's reservation request form is handled.",
    items: [
      ["Data collected", "Stay dates, number of guests and suites, preferred suite, first name, last name, phone, email (optional), special requests, language and the time of your consent."],
      ["Purpose", "Reviewing your reservation request and contacting you (WhatsApp or phone)."],
      ["Access", "Only authorised La Badira staff, through a secure administration area (two-factor authentication). Every action is logged."],
      ["Sharing", "Never sold or transferred to third parties. If you are contacted via WhatsApp, that conversation is subject to WhatsApp's terms."],
      ["Your rights", "You may request access to, correction or deletion of your data by writing to the address below."],
    ],
    contact: "Contact",
  },
  ar: {
    intro: "توضّح هذه الصفحة كيفية معالجة المعلومات المرسلة عبر نموذج طلب الحجز في هذا الموقع.",
    items: [
      ["البيانات المجمّعة", "تواريخ الإقامة، عدد الأشخاص والأجنحة، الجناح المفضّل، الاسم، اللقب، الهاتف، البريد الإلكتروني (اختياري)، الطلبات الخاصة، اللغة وتاريخ موافقتكم."],
      ["الغرض", "دراسة طلب الحجز والتواصل معكم (واتساب أو الهاتف)."],
      ["الوصول", "يقتصر على موظفي La Badira المخوّلين عبر فضاء إدارة آمن (مصادقة ثنائية). يتم تسجيل كل إجراء."],
      ["المشاركة", "لا تُباع البيانات ولا تُنقل إلى أطراف ثالثة. في حال التواصل عبر واتساب، تخضع المحادثة لشروط واتساب."],
      ["حقوقكم", "يمكنكم طلب الاطلاع على بياناتكم أو تصحيحها أو حذفها بمراسلتنا على العنوان أدناه."],
    ],
    contact: "اتصل بنا",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { ...pageMetadata({ locale: lang, path: routes.privacy, title: dict.privacy.title, description: copy[lang].intro }), robots: { index: false } };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, contact] = await Promise.all([getDictionary(lang), getContactSettings()]);
  const c = copy[lang];
  return (
    <section className="pb-28 pt-40 md:pt-52">
      <div className="container-luxe max-w-4xl">
        <h1 className="display display-lg text-balance">{dict.privacy.title}</h1>
        <p className="lede mt-8 text-stone">{c.intro}</p>
        <dl className="mt-14 border-t border-charcoal/15">
          {c.items.map(([k, v]) => (
            <div key={k} className="grid gap-3 border-b border-charcoal/15 py-7 md:grid-cols-3">
              <dt className="eyebrow text-champagne-deep">{k}</dt>
              <dd className="md:col-span-2">{v}</dd>
            </div>
          ))}
          <div className="grid gap-3 py-7 md:grid-cols-3">
            <dt className="eyebrow text-champagne-deep">{c.contact}</dt>
            <dd className="md:col-span-2"><a className="link-draw" href={`mailto:${contact.email}`}>{contact.email}</a></dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
