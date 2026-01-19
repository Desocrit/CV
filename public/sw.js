// Service Worker with Network-First Strategy
// Version: 1.1.0

const CACHE_NAME = 'cv-cache-v3';
const CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

// Paths that should never be cached
const NO_CACHE_PATHS = [
  '/api/',
];

// Check if a request should bypass the cache
function shouldBypassCache(request) {
  const url = new URL(request.url);

  // Don't cache non-GET requests
  if (request.method !== 'GET') {
    return true;
  }

  // Don't cache requests to other origins
  if (url.origin !== self.location.origin) {
    return true;
  }

  // Don't cache paths in the NO_CACHE_PATHS list
  for (const path of NO_CACHE_PATHS) {
    if (url.pathname.startsWith(path)) {
      return true;
    }
  }

  return false;
}

// Check if a cached response is still fresh
function isCacheEntryFresh(cachedResponse) {
  if (!cachedResponse) {
    return false;
  }

  const cachedDate = cachedResponse.headers.get('sw-cached-at');
  if (!cachedDate) {
    return false;
  }

  const cacheAge = Date.now() - parseInt(cachedDate, 10);
  return cacheAge < CACHE_MAX_AGE_MS;
}

// Clone response and add cache timestamp header
async function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', Date.now().toString());

  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

// Network-first fetch handler
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Try to fetch from network first
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
      const responseToCache = await addCacheTimestamp(networkResponse.clone());
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Network failed - fall back to cache
    console.warn('[SW] Network request failed, falling back to cache:', error);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache available - throw the original error
    throw error;
  }
}

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
  // Skip requests that should bypass cache
  if (shouldBypassCache(event.request)) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});
