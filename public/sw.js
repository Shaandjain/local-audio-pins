/// <reference lib="webworker" />

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const MAP_TILE_CACHE = `map-tiles-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;

// App shell resources to pre-cache
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return (
              key.startsWith('app-shell-') ||
              key.startsWith('map-tiles-') ||
              key.startsWith('audio-')
            ) && key !== APP_SHELL_CACHE &&
              key !== MAP_TILE_CACHE &&
              key !== AUDIO_CACHE;
          })
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open tabs
  self.clients.claim();
});

// Fetch handler with different strategies per resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API routes - data should always be fresh
  if (url.pathname.startsWith('/api/')) return;

  // Skip auth-related paths
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/login')) return;

  // Map tiles: stale-while-revalidate
  if (isMapTileRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, MAP_TILE_CACHE));
    return;
  }

  // Audio files: cache-first (once played, keep offline)
  if (isAudioRequest(url)) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // App shell (HTML, JS, CSS): network-first with cache fallback
  if (isAppShellRequest(url, request)) {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    return;
  }
});

// --- Strategy implementations ---

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation requests, return cached root page
    if (request.mode === 'navigate') {
      const rootCached = await caches.match('/');
      if (rootCached) return rootCached;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

// --- Request type detection ---

function isMapTileRequest(url) {
  // OpenFreeMap and other common tile servers
  return (
    url.hostname.includes('tiles.openfreemap.org') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.pathname.includes('/tiles/') ||
    /\/\d+\/\d+\/\d+\.(png|pbf|mvt)/.test(url.pathname)
  );
}

function isAudioRequest(url) {
  return (
    url.pathname.startsWith('/api/audio/') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.ogg') ||
    url.pathname.endsWith('.wav')
  );
}

function isAppShellRequest(url, request) {
  // Navigation requests or static assets
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json')
  );
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
