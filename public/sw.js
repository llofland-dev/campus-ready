const CACHE_NAME = "campus-ready-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = ["/", "/menu", "/code", OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  // Precache each URL independently: one failing request (a redirect, a
  // hiccup) must not abort the whole install the way cache.addAll would.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
  );
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
  const sameOrigin = url.origin === self.location.origin;
  const isImage = request.destination === "image";

  // Cross-origin traffic is left alone, except images — org logos and
  // section icons live in Supabase Storage on another origin, and they need
  // to survive offline too.
  if (!sameOrigin && !isImage) return;

  // The admin side and the access-gate API must always hit the network —
  // caching them stale would be actively wrong (stale org content, or a
  // cached 401 blocking a since-corrected password).
  if (sameOrigin && (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/"))) return;

  // Next's client router fetches data-only (RSC) payloads when someone taps a
  // link inside the app. They are deliberately never cached: which payload a
  // given request maps to depends on router state, so a cached one can miss
  // (or worse, be a partial prefetch). Offline, the failed request makes the
  // router fall back to a normal page load instead — and that page is served
  // from the copy saved by syncPlan below, which is deterministic.
  if (sameOrigin && (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only keep good copies. Caching an error page (a 500 during a
        // server hiccup, a 404) would overwrite the last *working* copy and
        // leave staff with an error page the next time they're offline.
        // Cross-origin images come back opaque (status 0), so those are
        // accepted as-is.
        const cacheable = response.ok || (!sameOrigin && response.type === "opaque");
        if (cacheable) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // Navigations ignore Vary: the saved page was fetched without the
        // router's headers, and a real page load never sends them either.
        const cached = await caches.match(request, { ignoreVary: request.mode === "navigate" });
        if (cached) return cached;
        // Only a page navigation can sensibly be answered with an HTML
        // page. Answering a script, stylesheet, or data request with HTML
        // corrupts the page instead of failing cleanly — let those fail so
        // the browser (and Next's router, which falls back to a full page
        // load) can handle it.
        if (request.mode === "navigate") {
          return (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
        return Response.error();
      })
  );
});

// --- Offline copy of a whole plan -----------------------------------------
//
// Only pages that were opened as a full page load would otherwise be
// available offline, so someone who tapped around a plan while connected
// would still hit "You're offline" on those pages later. While online, the
// app asks us (see PlanOfflineSync) to walk the plan's pages and save each
// one as a real page, plus the scripts, styles and images it needs.

const PLAN_SYNC_MAX_PAGES = 150;
const PLAN_SYNC_MAX_ASSETS = 400;
const PLAN_SYNC_CONCURRENCY = 4;

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "sync-plan" || typeof data.code !== "string") return;
  const port = event.ports && event.ports[0];
  event.waitUntil(
    syncPlan(data.code)
      .then((result) => port && port.postMessage({ ok: true, ...result }))
      .catch(() => port && port.postMessage({ ok: false }))
  );
});

async function syncPlan(code) {
  // The code goes into a URL and a regular expression; anything unexpected
  // is not a plan we know how to walk.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) return { pages: 0, assets: 0 };

  const cache = await caches.open(CACHE_NAME);
  const root = `/plan/${code}`;
  const linkPattern = new RegExp(`href="(${root}(?:/[^"#?]*)?)"`, "g");
  const assetPattern = /\/_next\/(?:static\/[^"'\\\s)<>]+|image\?[^"'\\\s)<>]+)/g;
  const storagePattern = /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^"'\\\s)<>]+/g;

  const seen = new Set([root]);
  const queue = [root];
  const assets = new Set();
  let pages = 0;
  let visited = 0;

  while (queue.length && visited < PLAN_SYNC_MAX_PAGES) {
    const batch = queue.splice(0, PLAN_SYNC_CONCURRENCY);
    visited += batch.length;
    await Promise.all(
      batch.map(async (path) => {
        try {
          const response = await fetch(path, { credentials: "same-origin" });
          // An error page must not replace a working copy.
          if (!response.ok) return;

          let savedPath = path;
          if (response.redirected) {
            // A category with a single section sends people straight to it.
            // Save the destination as its own page, and a redirect under this
            // URL, so tapping the category works offline too. A redirect out
            // of the plan (e.g. back to the sign-in gate) is not worth saving.
            const target = new URL(response.url);
            const inPlan =
              target.origin === self.location.origin &&
              !target.search &&
              (target.pathname === root || target.pathname.startsWith(`${root}/`));
            if (!inPlan) return;
            savedPath = target.pathname;
            seen.add(savedPath);
            await cache.put(path, Response.redirect(target.href, 302));
          }

          const html = await response.clone().text();
          // A response that arrived through a redirect is flagged as such, and
          // the browser refuses to show a flagged response for a page load
          // ("redirected response used for a request whose redirect mode is not
          // follow"). A fresh copy of the same bytes carries no such flag.
          let copy = response;
          if (response.redirected) {
            const headers = new Headers(response.headers);
            headers.delete("content-encoding");
            headers.delete("content-length");
            copy = new Response(html, { status: response.status, statusText: response.statusText, headers });
          }
          await cache.put(savedPath, copy);
          pages++;
          for (const match of html.matchAll(linkPattern)) {
            if (!seen.has(match[1])) {
              seen.add(match[1]);
              queue.push(match[1]);
            }
          }
          for (const match of html.matchAll(assetPattern)) assets.add(match[0].replace(/&amp;/g, "&"));
          for (const match of html.matchAll(storagePattern)) assets.add(match[0].replace(/&amp;/g, "&"));
        } catch {
          // Offline or a hiccup mid-walk: keep whatever was saved so far.
        }
      })
    );
  }

  const wanted = [...assets].slice(0, PLAN_SYNC_MAX_ASSETS);
  let saved = 0;
  for (let i = 0; i < wanted.length; i += PLAN_SYNC_CONCURRENCY) {
    await Promise.all(
      wanted.slice(i, i + PLAN_SYNC_CONCURRENCY).map(async (asset) => {
        try {
          // Already saved by an earlier visit or sync — chunk filenames are
          // content-hashed, so a hit is never stale.
          if (await cache.match(asset)) return;
          const crossOrigin = asset.startsWith("http");
          const response = await fetch(crossOrigin ? new Request(asset, { mode: "no-cors" }) : asset);
          if (response.ok || response.type === "opaque") {
            await cache.put(asset, response);
            saved++;
          }
        } catch {
          // Best-effort.
        }
      })
    );
  }

  return { pages, assets: saved };
}
