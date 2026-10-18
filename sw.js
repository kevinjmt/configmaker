/* ConfigMaker v2.22 — offline cache.
   Navigations (index.html) : network-first pour que chaque rechargement
   recupere les dernieres refs ?v= ; le reste (assets versionnes, immuables)
   reste en cache-first. Repli hors-ligne sur le cache. */
const CACHE = 'configmaker-v102';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './assets/css/app.css', './assets/js/store.js', './assets/js/app.js', './assets/js/compat.js', './assets/js/psudb.js', './assets/js/idealo.js', './assets/js/tube.js', './assets/js/ai.js', './assets/js/fpsdb.js', './assets/js/perf.js', './assets/js/pcie.js', './assets/js/pcie-catalog.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const same = url.origin === self.location.origin;
  const isNav = e.request.mode === 'navigate' || (same && (url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')));
  if (isNav) {
    e.respondWith(fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => { if (same) c.put(e.request, copy); });
    return res;
  }).catch(() => caches.match('./index.html'))));
});
