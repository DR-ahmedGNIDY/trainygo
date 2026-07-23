/*
 * FITXNET Service Worker — intentionally THIN.
 *
 * It contains NO business logic: no deciding whether/whom/what to notify, no
 * localization, no filtering, no dedupe. The backend builds a finished payload
 * and this file only: receives push, shows it, handles the click, and keeps the
 * subscription fresh. All decisions live server-side.
 */

// 1) Receive push → show the pre-built notification.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "FITXNET" };
  }

  const title = payload.title || "FITXNET";
  const notificationId = payload.data && payload.data.notificationId;
  const options = {
    body: payload.body || "",
    icon: "/logo.png",
    badge: "/favicon.png",
    // `tag` collapses duplicates of the same notification if delivered twice.
    tag: notificationId || undefined,
    data: {
      link: payload.link || (payload.data && payload.data.link) || "/",
      notificationId,
    },
  };

  // Show it AND tell the backend it reached the device (completes the
  // sent → delivered lifecycle for Web Push, which has no server-side receipt).
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      notificationId
        ? fetch(`/api/notifications/${notificationId}/delivered`, {
            method: "POST",
            keepalive: true,
          }).catch(() => {})
        : Promise.resolve(),
    ]),
  );
});

// 2) Click → focus/open the link and tell the backend (simple event only).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const link = data.link || "/";

  event.waitUntil(
    (async () => {
      if (data.notificationId) {
        try {
          await fetch(`/api/notifications/${data.notificationId}/clicked`, {
            method: "POST",
            keepalive: true,
          });
        } catch (_e) {
          // best-effort; never block navigation on it.
        }
      }

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(link);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(link);
    })(),
  );
});

// 3) Subscription rotated by the browser → re-register (plumbing, not logic).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const sub = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : undefined,
        );
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub,
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : undefined,
          }),
          keepalive: true,
        });
      } catch (_e) {
        // The client will re-subscribe on next load if this fails.
      }
    })(),
  );
});
