// Keeps Blot working with no connection: the whole app is cached on first load.
const CACHE = 'blot-dbc2b65b9e';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('blot-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // a project sent from another device with Share (Quick Share, Nearby Share and the like): keep the file, then open Blot to ask what to do with it
  if (e.request.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/receive')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const f = fd.get('backup');
        if (f && f.size) { const c = await caches.open('incoming-share'); await c.put('incoming.zip', new Response(f, { headers: { 'content-type': 'application/zip', 'x-name': encodeURIComponent(f.name || 'shared.zip') } })); }
      } catch (err) {}
      return Response.redirect('./?received=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('index.html'))));
});
