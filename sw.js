// Service worker del tablero de producción: avisos push y la app abre aunque no haya red.
const CACHE = 'produccion-v1';
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/icono-192.png', '/icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Solo la propia app (mismo origen) pasa por la caché; Supabase va siempre directo.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/')))
  );
});

// Push: solo llegan los "te toca" (los mensajes normales no mandan push; suben el contador dentro de la app).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { titulo: 'Producción', texto: e.data ? e.data.text() : '' }; }
  const titulo = d.titulo || 'Te toca';
  e.waitUntil(Promise.all([
    self.registration.showNotification(titulo, {
      body: d.texto || '',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      tag: d.tag || 'aviso',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: d.url || '/' }
    }),
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : Promise.resolve()
  ]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) {
      if (new URL(c.url).origin === self.location.origin) {
        c.postMessage({ abrir: destino });
        return c.focus();
      }
    }
    return self.clients.openWindow(destino);
  }));
});
