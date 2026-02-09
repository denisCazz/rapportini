// Service Worker per Bitora PWA
const CACHE_NAME = 'bitora-v1';
const STATIC_CACHE = 'bitora-static-v1';
const DYNAMIC_CACHE = 'bitora-dynamic-v1';

// Risorse da cacheare immediatamente
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
];

// Installa il service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Attiva il service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Strategia di caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non cacheare le API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Per le risorse statiche, usa cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Per le pagine, usa network-first con fallback
  event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network-first fetch failed, trying cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Fallback per pagine offline
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Gestione messaggi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync per salvare rapportini offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rapportini') {
    event.waitUntil(syncRapportini());
  }
});

async function syncRapportini() {
  // Recupera rapportini salvati offline da IndexedDB
  // e inviali al server quando torna la connessione
  console.log('[SW] Syncing offline rapportini...');
  // Implementazione da completare con IndexedDB
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Bitora - Gestione Rapportini', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
