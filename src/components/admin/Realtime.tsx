"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Toast = { key: number; title: string; body: string; href: string };
type FeedEvent = { id: number; type: string; reservationId: string; reference: string; name?: string; checkIn?: string; checkOut?: string };

/** Visible tab: every 10 s. Background tab: every 60 s (Workers Free request budget). */
const POLL_VISIBLE_MS = 10_000;
const POLL_HIDDEN_MS = 60_000;

/** Short two-note chime (Web Audio, no file). Browsers allow it after any click on the page. */
let audio: AudioContext | undefined;
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {}
}
function playChime() {
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  for (const [i, freq] of [880, 1318.5].entries()) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.6);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.65);
  }
}

/**
 * Polls the event feed: toasts + chime for new reservation requests, an
 * unread counter in the tab title, and a refresh of server components so
 * lists and counters update. (OS notifications come from Web Push.)
 */
export function RealtimeBridge() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(true);
  const cursor = useRef<number | null>(null);
  const unread = useRef(0);
  const baseTitle = useRef<string>("");

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    baseTitle.current = document.title.replace(/^\(\d+\) /, "");
    const setTitle = () => {
      document.title = unread.current > 0 ? `(${unread.current}) ${baseTitle.current}` : baseTitle.current;
    };
    const clearUnread = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        unread.current = 0;
        setTitle();
      }
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("focus", clearUnread);

    const tick = async () => {
      if (stopped) return;
      {
        try {
          const url = cursor.current === null ? "/api/admin/events" : `/api/admin/events?after=${cursor.current}`;
          const res = await fetch(url, { cache: "no-store" });
          if (res.status === 401) {
            stopped = true;
            return;
          }
          const data = (await res.json()) as { cursor: number; events: FeedEvent[] };
          const first = cursor.current === null;
          cursor.current = data.cursor;
          setOnline(true);
          if (!first && data.events.length) {
            let fresh = 0;
            for (const ev of data.events) {
              if (ev.type !== "reservation.created") continue;
              fresh++;
              const toast: Toast = {
                key: ev.id,
                title: `Nouvelle demande · ${ev.reference}`,
                body: `${ev.name ?? ""} — ${ev.checkIn ?? ""} → ${ev.checkOut ?? ""}`,
                href: `/admin/reservations/${ev.reservationId}`,
              };
              setToasts((t) => [toast, ...t.filter((x) => x.key !== toast.key)].slice(0, 4));
              window.setTimeout(() => setToasts((t) => t.filter((x) => x.key !== toast.key)), 12000);
            }
            if (fresh) {
              playChime();
              if (!(document.visibilityState === "visible" && document.hasFocus())) {
                unread.current += fresh;
                setTitle();
              }
            }
            router.refresh();
          }
        } catch {
          setOnline(false);
        }
      }
      timer = window.setTimeout(tick, document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS);
    };
    tick();

    const onVisible = () => {
      clearUnread();
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    // Service worker → page: a push arrived while this dashboard was focused.
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "push") router.refresh();
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("focus", clearUnread);
      document.title = baseTitle.current;
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [router]);

  return (
    <>
      <span className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-[#1f6f43]" : "text-stone"}`} title="Mises à jour automatiques">
        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#1f9d55]" : "bg-stone/50"}`} />
        {online ? "Temps réel" : "Reconnexion…"}
      </span>
      <div aria-live="polite" className="fixed bottom-4 end-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.key} className="a-card flex items-start gap-3 p-4 shadow-lg">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-champagne" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              <p className="truncate text-xs text-stone">{t.body}</p>
              <Link href={t.href} className="mt-2 inline-block text-xs font-medium underline underline-offset-4">Ouvrir la demande</Link>
            </div>
            <button type="button" aria-label="Fermer" className="text-stone" onClick={() => setToasts((x) => x.filter((y) => y.key !== t.key))}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}
