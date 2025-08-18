const CACHE_NAME = 'roadweave-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache traveler and public pages
  if (event.request.url.includes('/traveler/') || event.request.url.includes('/public/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // Serve from cache and update in background
            fetch(event.request).then((fetchResponse) => {
              cache.put(event.request, fetchResponse.clone());
            }).catch(() => {});
            return response;
          }
          // Not in cache, fetch and cache
          return fetch(event.request).then((fetchResponse) => {
            if (fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // Offline fallback for uploads
            if (event.request.method === 'POST' && event.request.url.includes('/entries')) {
              return new Response(JSON.stringify({
                error: 'Offline - request queued',
                offline: true
              }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            // For other requests, try to serve a basic offline page
            return new Response('Offline', { status: 503 });
          });
        });
      })
    );
  } else {
    // Default handling for other requests
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});