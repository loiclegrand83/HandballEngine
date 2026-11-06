// Service worker : application et données consultables hors ligne (S6).
// - pages, CSS, JS, images : réponse immédiate depuis le cache, mise à jour en arrière-plan ;
// - GET /api/* : réseau d'abord, repli sur la dernière réponse connue (en-tête x-haweb-cache) ;
// - schémas /api/versions/*/snapshot : cache d'abord (images immuables) ;
// - les écritures (POST, PUT, PATCH, DELETE) ne sont jamais interceptées.
const CACHE = 'handball-engine-v2';
const DATA_CACHE = 'handball-engine-data-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/player.png',
  '/assets/icons/pwa-192.png',
  '/assets/icons/pwa-512.png',
  '/pages/startup.html',
  '/pages/board.html',
  '/pages/seance.html',
  '/pages/planning.html',
  '/pages/explanation.html',
  '/pages/bibliotheque.html',
  '/pages/guide.html',
  '/src/css/assets-grid.css',
  '/src/css/bibliotheque.css',
  '/src/css/components.css',
  '/src/css/design-tokens.css',
  '/src/css/dock.css',
  '/src/css/explanation.css',
  '/src/css/glassmorphism.css',
  '/src/css/guide.css',
  '/src/css/home.css',
  '/src/css/panel.css',
  '/src/css/planning.css',
  '/src/css/seance.css',
  '/src/css/sidebar.css',
  '/src/css/styles.css',
  '/src/css/trame-print.css',
  '/src/css/trame.css',
  '/src/js/api.js',
  '/src/js/app.js',
  '/src/js/bibliotheque.js',
  '/src/js/board-quickbar.js',
  '/src/js/canvas-reflow.js',
  '/src/js/dock.js',
  '/src/js/home.js',
  '/src/js/keyboard-nav.js',
  '/src/js/planning.js',
  '/src/js/pwa.js',
  '/src/js/seance.js',
  '/src/js/snapshots.js',
  '/src/js/ui.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== DATA_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function offlineResponse() {
  return new Response(JSON.stringify({ error: 'Hors ligne' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'x-haweb-offline': '1' },
  });
}

// Copie d'une réponse en cache avec un en-tête indiquant qu'elle ne vient pas du serveur.
async function markedFromCache(cached) {
  const headers = new Headers(cached.headers);
  headers.set('x-haweb-cache', '1');
  return new Response(await cached.blob(), { status: cached.status, statusText: cached.statusText, headers });
}

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    return cached ? markedFromCache(cached) : offlineResponse();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return offlineResponse();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/backup' || url.pathname.startsWith('/api/exports/')) return;
    if (/^\/api\/versions\/[^/]+\/snapshot$/.test(url.pathname)) return event.respondWith(cacheFirst(event.request));
    return event.respondWith(networkFirst(event.request));
  }
  event.respondWith(staleWhileRevalidate(event.request));
});
