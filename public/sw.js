// ECSecora PWA service worker.
// Intentionally conservative: it only caches the immutable, fingerprinted Vite
// build assets (cache-first for speed/offline shell). It does NOT intercept
// page navigations or API/Inertia requests, so auth, CSRF, and live data always
// go to the network and are never served stale.

const CACHE = 'ecsecora-static-v1';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    // Only handle same-origin fingerprinted build assets.
    if (url.origin !== self.location.origin) return;
    if (!url.pathname.startsWith('/build/')) return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE);
            const cached = await cache.match(req);
            if (cached) return cached;
            try {
                const res = await fetch(req);
                if (res.ok) cache.put(req, res.clone());
                return res;
            } catch (e) {
                return cached || Response.error();
            }
        })(),
    );
});
