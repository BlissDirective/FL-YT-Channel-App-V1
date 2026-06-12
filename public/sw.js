/* Faceless Studio service worker — web-push delivery + notification clicks. */

self.addEventListener("push", (event) => {
  let payload = { title: "Faceless Studio", body: "", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    /* non-JSON push — show defaults */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ("focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
