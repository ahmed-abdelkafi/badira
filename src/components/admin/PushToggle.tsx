"use client";

import Link from "next/link";
import { usePushNotifications } from "./usePushNotifications";

const help = {
  unsupported: "Ce navigateur ne prend pas en charge les notifications. Utilisez Chrome, Edge, Firefox ou Safari récent.",
  "ios-needs-install": "Sur iPhone/iPad : touchez « Partager » puis « Sur l’écran d’accueil », ouvrez le tableau de bord depuis l’icône, puis activez les notifications.",
  denied: "Les notifications sont bloquées pour ce site. Cliquez sur le cadenas à gauche de l’adresse → Notifications → Autoriser, puis rechargez la page.",
};

/** Full control panel (Mon compte). */
export function PushToggle({ vapidKey, serverReady }: { vapidKey: string | undefined; serverReady: boolean }) {
  const { status, message, pending, enable, disable, test } = usePushNotifications(vapidKey);
  if (!serverReady) return <p className="text-sm text-stone">Le serveur n’a pas de clés VAPID : les notifications sont désactivées.</p>;
  return (
    <div className="space-y-3 text-sm">
      {status === "loading" && <p className="text-stone">Vérification…</p>}
      {(status === "unsupported" || status === "ios-needs-install" || status === "denied") && (
        <p className={status === "denied" ? "text-[#b42318]" : "text-stone"}>{help[status]}</p>
      )}
      {status === "off" && (
        <button type="button" className="a-btn a-btn-primary" onClick={enable} disabled={pending}>
          🔔 Activer les notifications sur cet appareil
        </button>
      )}
      {status === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="a-badge border-[#c6e6d2] bg-[#eaf6ef] text-[#1f6f43]">✓ Activées sur cet appareil</span>
          <button type="button" className="a-btn a-btn-sm" onClick={test} disabled={pending}>Envoyer un test</button>
          <button type="button" className="a-btn a-btn-sm" onClick={disable} disabled={pending}>Désactiver</button>
        </div>
      )}
      {message && <p role="status" className="text-stone">{message}</p>}
    </div>
  );
}

/** Compact bell for the admin top bar (every page). */
export function NotificationBell({ vapidKey }: { vapidKey: string | undefined }) {
  const { status, pending, enable } = usePushNotifications(vapidKey);
  if (status === "loading") return null;
  if (status === "on")
    return (
      <Link href="/admin/account" className="inline-flex items-center gap-1.5 text-xs text-[#1f6f43]" title="Notifications activées sur cet appareil">
        <span aria-hidden="true">🔔</span> Notifications
      </Link>
    );
  if (status === "off")
    return (
      <button type="button" onClick={enable} disabled={pending} className="a-btn a-btn-sm border-champagne bg-[#fbf6ea]">
        <span aria-hidden="true">🔔</span> Activer les notifications
      </button>
    );
  return (
    <Link href="/admin/account" className="inline-flex items-center gap-1.5 text-xs text-[#8a5a00]" title={help[status]}>
      <span aria-hidden="true">🔕</span> Notifications indisponibles
    </Link>
  );
}

/** Dashboard reminder shown until this device is subscribed. */
export function NotificationBanner({ vapidKey }: { vapidKey: string | undefined }) {
  const { status, pending, enable, message } = usePushNotifications(vapidKey);
  if (status === "loading" || status === "on") return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded border border-[#e6d9bf] bg-[#fbf6ea] px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-medium">🔔 Soyez alerté de chaque nouvelle demande de réservation</p>
        <p className="text-stone">
          {status === "off" ? "Activez les notifications du navigateur sur cet appareil : elles s’affichent même quand le tableau de bord est fermé." : help[status]}
        </p>
        {message && <p className="mt-1 text-stone">{message}</p>}
      </div>
      {status === "off" && (
        <button type="button" onClick={enable} disabled={pending} className="a-btn a-btn-primary shrink-0">
          Activer sur cet appareil
        </button>
      )}
    </div>
  );
}
