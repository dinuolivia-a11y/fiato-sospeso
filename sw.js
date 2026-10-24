/* Fiato Sospeso: permette di giocare anche senza internet.
   Alla prima apertura salva il gioco sul telefono; dopo lo aggiorna da solo in sottofondo. */
const CACHE = 'fiato-sospeso-v3';
// Sullo stesso sito possono esserci anche altri giochi: si toccano e si leggono solo le cache di questo.
const PREFIX = CACHE.replace(/v\d+$/, '');
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !font) return;
  const cached = caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }));
  const fresh = fetch(req).then(res => {
    if (!res || !(res.ok || res.type === 'opaque')) return res;
    const copy = res.clone();
    return caches.open(CACHE).then(c => c.put(req, copy)).then(() => res, () => res);
  });
  e.respondWith(cached.then(hit => hit || fresh, () => fresh));
  e.waitUntil(fresh.catch(() => {}));
});
