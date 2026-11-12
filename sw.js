// Service worker del tablero de producción: avisos en la barra del teléfono y la app abre aunque no haya red.
const CACHE = 'produccion-v2';
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/icono-192.png', '/icono-512.png', '/icono-barra.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).catch(() => {}).then(() => self.skipWaiting()));
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

function leer(e) {
  if (!e.data) return {};
  try { return e.data.json(); } catch (_) {}
  try { return { texto: e.data.text() }; } catch (_) { return {}; }
}

function mostrar(d) {
  return self.registration.showNotification(d.titulo || 'Te toca', {
    body: d.texto || 'Abre el tablero de producción.',
    icon: '/icono-192.png',
    badge: '/icono-barra.png',      // ícono blanco que Android pone en la barra de arriba
    tag: d.tag || ('aviso-' + Date.now()),
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    data: { url: d.url || '/' }
  });
}

// Push: solo llegan los "te toca". Primero SIEMPRE la notificación en la barra; el número en el ícono va aparte.
self.addEventListener('push', (e) => {
  const d = leer(e);
  e.waitUntil(mostrar(d).then(() => {
    try { if (self.navigator && self.navigator.setAppBadge) return self.navigator.setAppBadge().catch(() => {}); } catch (_) {}
  }));
});

// La app puede pedir una notificación de prueba local (botón "Probar aviso").
self.addEventListener('message', (e) => {
  if (e.data && e.data.prueba) e.waitUntil(mostrar({ titulo: 'Te toca · prueba', texto: 'Así se ven los avisos del tablero en tu barra.', tag: 'prueba-local' }));
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
