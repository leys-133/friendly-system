self.addEventListener('install', event => {
  event.waitUntil(caches.open('seven_code7-v1').then(c => c.addAll([
    '/', '/index.html', '/styles.css', '/app.js', '/logo.svg'
  ])).catch(() => {}));
});
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open('seven_code7-v1');
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && req.url.startsWith(self.location.origin)) {
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});

