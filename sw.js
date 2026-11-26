/* ESCULTOR · funciona sin conexión.
   Archivos de la app: primero la red (para recibir actualizaciones) y, si no hay, la copia guardada.
   Detectores y pdf.js (pesados): primero la copia guardada. */
const CACHE = 'escultor-v3';
const BASE = ['./', 'index.html', 'app.js', 'canon.js', 'nativo.js', 'lib.js', 'modos.js', 'extra.js', 'anatomia.js', 'animales.js', 'cabello.js', 'taller.js', 'arte.js', 'organizar.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/mp/') || u.pathname.includes('/pdf/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const r = await c.match(e.request); if (r) return r;
      const n = await fetch(e.request); if (n.ok) c.put(e.request, n.clone()); return n;
    }));
    return;
  }
  e.respondWith(fetch(e.request).then((n) => { if (n.ok) { const cp = n.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return n; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
