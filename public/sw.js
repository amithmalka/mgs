/* MGS service worker — web push only.
 *
 * Deliberately dependency-free and tiny: it is fetched from the site root so
 * its scope covers the whole app, and it must keep working even when a build
 * changes everything else. No fetch handler, no caching — we only want
 * notifications, so adding offline logic here would silently change how the
 * app loads.
 */

self.addEventListener('install', () => {
  // Take over immediately instead of waiting for every old tab to close,
  // otherwise a freshly subscribed user gets no notifications until a reload.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  // The payload is JSON we send ourselves, but a push can also arrive empty
  // (some browsers wake the worker that way), so fall back to sane Hebrew text.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'MGS';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: payload.icon || '/favicon.svg',
    dir: 'rtl',
    lang: 'he',
    // A stable tag collapses a re-sent reminder instead of stacking duplicates.
    tag: payload.tag || 'mgs-deposit',
    renotify: true,
    data: { url: (payload.data && payload.data.url) || payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const url = new URL(target, self.location.origin);
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Prefer focusing a tab the user already has open — opening a second copy
      // of a single-page app loses whatever state they had.
      for (const client of windows) {
        if (new URL(client.url).origin !== url.origin) continue;
        await client.focus();
        if (client.url !== url.href && 'navigate' in client) {
          try {
            await client.navigate(url.href);
          } catch {
            // Navigation can be rejected (e.g. the tab is cross-origin now);
            // a focused tab is still better than nothing.
          }
        }
        return;
      }

      await self.clients.openWindow(url.href);
    })()
  );
});
