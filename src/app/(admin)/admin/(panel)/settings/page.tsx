import { requireAdmin } from "@/server/auth/dal";
import { getContactSettings, getWhatsAppTemplates } from "@/server/content/queries";
import { env, pushConfigured } from "@/server/env";
import { PageHeader } from "@/components/admin/ui";
import { ContactForm, TemplatesForm } from "@/components/admin/ConfigForms";

export const metadata = { title: "Coordonnées & WhatsApp" };

export default async function SettingsPage() {
  await requireAdmin("settings.manage");
  const [contact, templates] = await Promise.all([getContactSettings(), getWhatsAppTemplates()]);
  const e = env();

  return (
    <>
      <PageHeader title="Coordonnées & WhatsApp" description="Informations publiées sur le site et modèles de messages WhatsApp." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="a-card p-5">
          <h2 className="a-h2 mb-4">Coordonnées publiques</h2>
          <ContactForm c={contact as never} />
        </section>
        <div className="space-y-6">
          <section className="a-card p-5">
            <h2 className="a-h2 mb-4">Modèles WhatsApp</h2>
            <TemplatesForm templates={templates} />
          </section>
          <section className="a-card p-5 text-sm">
            <h2 className="a-h2 mb-3">État des intégrations</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-2">
              <dt>Notifications push (VAPID)</dt><dd>{pushConfigured() ? "✓ Configuré" : "Non configuré"}</dd>
              <dt>WhatsApp</dt>
              <dd>{e.WHATSAPP_PROVIDER === "cloud_api" ? "API Cloud (non activée dans cette version)" : "Click-to-chat (envoi manuel)"}</dd>
            </dl>
            <p className="mt-3 text-xs text-stone">
              Le mode click-to-chat ouvre WhatsApp avec un message pré-rempli ; l’envoi est fait par l’employé. L’envoi automatique nécessite un compte WhatsApp Business Platform validé par Meta (voir DEPLOYMENT.md).
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
