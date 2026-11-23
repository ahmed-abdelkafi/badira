import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/dates";
import { waDigits } from "@/lib/phone";

export type WhatsAppTemplateKind = "accept" | "decline" | "general";
export type WhatsAppTemplates = Record<WhatsAppTemplateKind, Record<Locale, string>>;

/** Placeholders: [CLIENT] [REFERENCE] [CHECK_IN] [CHECK_OUT] [CATEGORY] [GUESTS] */
export const defaultWhatsAppTemplates: WhatsAppTemplates = {
  accept: {
    fr: "Bonjour [CLIENT], nous avons le plaisir de vous confirmer que votre demande de réservation [REFERENCE] pour votre séjour du [CHECK_IN] au [CHECK_OUT] a été acceptée. Nous serons ravis de vous accueillir à La Badira.",
    en: "Hello [CLIENT], we are delighted to confirm that your reservation request [REFERENCE] for your stay from [CHECK_IN] to [CHECK_OUT] has been accepted. We look forward to welcoming you to La Badira.",
    ar: "مرحباً [CLIENT]، يسعدنا أن نؤكد لكم قبول طلب الحجز [REFERENCE] لإقامتكم من [CHECK_IN] إلى [CHECK_OUT]. سنكون سعداء باستقبالكم في La Badira.",
  },
  decline: {
    fr: "Bonjour [CLIENT], nous vous remercions pour votre intérêt envers La Badira. Malheureusement, nous ne sommes pas en mesure de confirmer votre demande de réservation [REFERENCE] pour les dates souhaitées. N'hésitez pas à nous contacter pour étudier d'autres possibilités.",
    en: "Hello [CLIENT], thank you for your interest in La Badira. Unfortunately, we are unable to confirm your reservation request [REFERENCE] for the requested dates. Please do not hesitate to contact us to explore other options.",
    ar: "مرحباً [CLIENT]، نشكركم على اهتمامكم بـ La Badira. للأسف، لا يمكننا تأكيد طلب الحجز [REFERENCE] في التواريخ المطلوبة. لا تترددوا في التواصل معنا لدراسة إمكانيات أخرى.",
  },
  general: {
    fr: "Bonjour [CLIENT], nous revenons vers vous concernant votre demande de réservation [REFERENCE] pour votre séjour du [CHECK_IN] au [CHECK_OUT] ([CATEGORY]).",
    en: "Hello [CLIENT], we are getting back to you regarding your reservation request [REFERENCE] for your stay from [CHECK_IN] to [CHECK_OUT] ([CATEGORY]).",
    ar: "مرحباً [CLIENT]، نتواصل معكم بخصوص طلب الحجز [REFERENCE] لإقامتكم من [CHECK_IN] إلى [CHECK_OUT] ([CATEGORY]).",
  },
};

export type WhatsAppReservationContext = {
  firstName: string;
  lastName: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  categoryLabel: string;
  guests: number;
};

export function renderWhatsAppTemplate(template: string, ctx: WhatsAppReservationContext, locale: Locale): string {
  const values: Record<string, string> = {
    CLIENT: `${ctx.firstName} ${ctx.lastName}`.trim(),
    REFERENCE: ctx.reference,
    CHECK_IN: formatDate(ctx.checkIn, locale),
    CHECK_OUT: formatDate(ctx.checkOut, locale),
    CATEGORY: ctx.categoryLabel,
    GUESTS: String(ctx.guests),
  };
  return template.replace(/\[(CLIENT|REFERENCE|CHECK_IN|CHECK_OUT|CATEGORY|GUESTS)\]/g, (_, k: string) => values[k]);
}

/**
 * WhatsApp click-to-chat URL. This only OPENS a conversation with a pre-filled
 * message — the administrator still has to press "send". Nothing is delivered
 * automatically, so the app must never report delivery for this channel.
 */
export function buildWhatsAppUrl(phoneE164: string, message?: string): string {
  const base = `https://wa.me/${waDigits(phoneE164)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
