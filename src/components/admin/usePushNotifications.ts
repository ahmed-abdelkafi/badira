"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { subscribePushAction, testPushAction, unsubscribePushAction } from "@/app/(admin)/admin/(panel)/account/actions";

export type PushStatus = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

const EVENT = "badira:push-status";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIosNotInstalled() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/**
 * Browser (Web Push) notifications for this device.
 * - Permission is requested ONLY on an explicit click.
 * - The existing subscription is re-synced to the server on each visit
 *   (covers browsers that silently rotate subscriptions).
 * - Every component using this hook on the page stays in sync.
 */
export function usePushNotifications(vapidKey: string | undefined) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const broadcast = useCallback((s: PushStatus) => {
    setStatus(s);
    window.dispatchEvent(new CustomEvent<PushStatus>(EVENT, { detail: s }));
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => setStatus((e as CustomEvent<PushStatus>).detail);
    window.addEventListener(EVENT, onChange);
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setStatus(isIosNotInstalled() ? "ios-needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        await subscribePushAction(sub.toJSON());
        setStatus("on");
      } else setStatus("off");
    })().catch(() => setStatus("unsupported"));
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const enable = useCallback(
    () =>
      start(async () => {
        setMessage(null);
        if (!vapidKey) return setMessage("Clé publique VAPID absente : contactez l’administrateur technique.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return broadcast(permission === "denied" ? "denied" : "off");
        const reg = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
        const res = await subscribePushAction(sub.toJSON());
        if (res.ok) {
          broadcast("on");
          setMessage("Notifications activées sur cet appareil.");
        } else {
          await sub.unsubscribe();
          setMessage(res.error ?? "Échec de l’activation.");
        }
      }),
    [vapidKey, broadcast],
  );

  const disable = useCallback(
    () =>
      start(async () => {
        const reg = await navigator.serviceWorker.getRegistration("/admin");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await unsubscribePushAction(sub.endpoint);
          await sub.unsubscribe();
        }
        broadcast("off");
        setMessage(null);
      }),
    [broadcast],
  );

  const test = useCallback(
    () =>
      start(async () => {
        const res = await testPushAction();
        setMessage(res.ok ? "Notification de test envoyée — elle devrait apparaître dans quelques secondes (réduisez la fenêtre pour la voir)." : res.message);
      }),
    [],
  );

  return { status, message, pending, enable, disable, test };
}
