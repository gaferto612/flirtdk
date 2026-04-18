// FlirtDK Service Worker – håndterer push-notifikationer

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// ── Modtag push ──────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'FlirtDK', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FlirtDK', {
      body:  data.body  || '',
      icon:  data.icon  || '/icon-192.png',
      badge: '/icon-192.png',
      data:  { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Klik på notifikation → åbn siden ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
