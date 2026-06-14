/* Pantry Digitiser - basic offline shell service worker.
   Paths are RELATIVE so this works whether the app is hosted at "/"
   (local dev / root deploy) or at a subpath like "/digitalpantry/"
   (GitHub Pages). The browser resolves "./foo" against the SW's URL. */
const CACHE = "pantry-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./logo192.png",
  "./logo512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API calls — always go to network.
  if (
    url.hostname.includes("openfoodfacts.org") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("generativelanguage") ||
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com")
  ) {
    return;
  }

  // App shell: network-first, fall back to cache, then index for SPA routes.
  const indexUrl = new URL("./index.html", self.registration.scope).toString();
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match(indexUrl))
      )
  );
});
