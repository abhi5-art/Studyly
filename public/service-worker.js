const CACHE_NAME = 'appV2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/media/banner.8e687823b1422880cc3f.mp4'
];

// Installation Phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.log('Cache addAll failed:', err);
      })
  );
});

// Activation & Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Handling
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  // API Cache Strategy
  if (requestUrl.origin === 'https://api.dicebear.com' && 
      requestUrl.pathname.startsWith('/5.x/initials/svg')) {
    event.respondWith(cacheFirst(request, 'avatar-cache'));
    return;
  }

  // Static Assets Strategy
  event.respondWith(
    networkFirst(request)
      .catch(() => caches.match('/offline.html'))
  );
});

// Strategies
const cacheFirst = async (request, cacheName = CACHE_NAME) => {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  return cachedResponse || fetchAndCache(request, cache);
};

const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || Promise.reject('No cache');
  }
};

const fetchAndCache = async (request, cache) => {
  const networkResponse = await fetch(request);
  cache.put(request, networkResponse.clone());
  return networkResponse;
};