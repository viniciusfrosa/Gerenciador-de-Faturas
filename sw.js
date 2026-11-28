const CACHE_NAME = 'pwa-cache-v3';
const CACHE_PREFIX = 'pwa-cache-';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './enhancements.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function injectEnhancements(response) {
  if (!response || !response.ok) return response;

  const html = await response.text();
  if (html.includes('src="./enhancements.js"')) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }

  const script = '<script src="./enhancements.js"></script>\n';
  const marker = '<!-- Script Principal -->';
  const transformed = html.includes(marker)
    ? html.replace(marker, `${script}${marker}`)
    : html.replace('</body>', `${script}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const transformed = await injectEnhancements(response);
        await cacheResponse(request, transformed);
        return transformed;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match(new URL('./index.html', self.registration.scope).href);
        return fallback ? injectEnhancements(fallback) : Response.error();
      }
    })());
    return;
  }

  const isManifest = url.pathname.endsWith('/manifest.json');
  event.respondWith((async () => {
    if (!isManifest) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }

    try {
      return await cacheResponse(request, await fetch(request));
    } catch {
      return await caches.match(request) || Response.error();
    }
  })());
});
