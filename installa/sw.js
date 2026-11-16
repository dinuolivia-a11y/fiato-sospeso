/* Il file di gioco include già fotografia, caratteri, testi e suoni. */
const family = 'fiato-sospeso:' + self.registration.scope + ':';
const version = family + 'laboratorio-install-1';
const files = ['./index.html', './manifest.webmanifest', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const indexURL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    await cache.addAll(files.map(file => new Request(new URL(file, self.registration.scope), {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(family) && key !== version) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const pathname = url.origin + url.pathname;
  if (request.mode === 'navigate' && (pathname === indexURL || pathname === self.registration.scope)) {
    event.respondWith((async () => {
      const cache = await caches.open(version);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(indexURL, response.clone());
          return response;
        }
        return (await cache.match(indexURL)) || response;
      } catch {
        return (await cache.match(indexURL)) || Response.error();
      }
    })());
  } else if (files.some(file => new URL(file, self.registration.scope).href === pathname)) {
    event.respondWith((async () => (await (await caches.open(version)).match(pathname)) || fetch(request))());
  }
});
