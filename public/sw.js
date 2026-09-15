const CACHE_NAME = "campus-ready-v1";
const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Network-first, falling back to cache when offline. This covers both page
// navigations (so a previously-viewed plan page still renders offline) and
// static assets (_next/static, icon, manifest) with one strategy. Every
// successful online fetch re-caches its response, which is also how staff
// get the latest published content the next time they open the app with
// connectivity — no separate "check for updates" step needed.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // The admin side and the access-gate API must always hit the network —
  // caching them stale would be actively wrong (stale org content, or a
  // cached 401 blocking a since-corrected password).
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/")))
  );
});
