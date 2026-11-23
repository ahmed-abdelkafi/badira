/* La Badira — admin service worker (Web Push).
 * Scope: /admin. Shows a notification for each push; if a dashboard window is
 * focused, it is told to refresh instead (the in-app toast already shows it),
 * avoiding duplicate alerts. Tags collapse repeats of the same reservation. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "La Badira", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "La Badira — nouvelle notification";
  const url = typeof data.url === "string" && data.url.startsWith("/admin") ? data.url : "/admin";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = windows.find((w) => w.focused && new URL(w.url).pathname.startsWith("/admin"));
      if (focused) {
        focused.postMessage({ type: "push", payload: data });
        return;
      }
      await self.registration.showNotification(title, {
        body: data.body || "",
        tag: data.tag || undefined,
        renotify: false,
        icon: "/admin-icon-192.png",
        badge: "/admin-badge-72.png",
        data: { url },
        // Stays on screen until a staff member clicks it (reception desks).
        requireInteraction: true,
        vibrate: [120, 60, 120],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (new URL(w.url).pathname.startsWith("/admin") && "focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

/* Browser rotated the subscription: the dashboard re-syncs it on next visit. */
self.addEventListener("pushsubscriptionchange", () => {});
