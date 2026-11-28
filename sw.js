const CACHE_NAME = 'pwa-cache-v5';
const CACHE_PREFIX = 'pwa-cache-';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './enhancements.js',
  './ui-fixes.js',
  './sw.js',
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
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
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
  let transformed = html;
  const scripts = [
    ['src="./enhancements.js"', '<script src="./enhancements.js"></script>\n'],
    ['src="./ui-fixes.js"', '<script src="./ui-fixes.js"></script>\n']
  ];

  for (const [marker, script] of scripts) {
    if (transformed.includes(marker)) continue;
    const insertionPoint = '<!-- Script Principal -->';
    transformed = transformed.includes(insertionPoint)
      ? transformed.replace(insertionPoint, `${script}${insertionPoint}`)
      : transformed.replace('</body>', `${script}</body>`);
  }

  if (transformed === html) return response;

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

        const fallback = await caches.match(
          new URL('./index.html', self.registration.scope).href
        );
        return fallback ? injectEnhancements(fallback) : Response.error();
      }
    })());
    return;
  }

  if (url.pathname.endsWith('/manifest.json')) {
    event.respondWith((async () => {
      try {
        return await cacheResponse(request, await fetch(request));
      } catch {
        return await caches.match(request) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const networkResponse = fetch(request)
      .then((response) => cacheResponse(request, response))
      .catch(() => null);

    if (cached) {
      event.waitUntil(networkResponse);
      return cached;
    }

    const response = await networkResponse;
    return response || Response.error();
  })());
});
