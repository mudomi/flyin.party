const CACHE_NAME = 'flyin-party-v1.3';
const urlsToCache = [
  '/',
  '/index.html',
  '/guess-whomst-d-ve/',
  '/guess-whomst-d-ve/index.html',
  '/guess-whomst-d-ve/words.txt',
  '/manifest.json',
  '/sitemap.xml',
  '/robots.txt',
  '/assets/icon/icon-192x192.png',
  '/assets/icon/icon-512x512.png',
  '/assets/icon/icon.png',
  '/sw.js',
  '/offline.html',
  '/assets/fonts/inter/inter.css',
  '/assets/fonts/inter/Inter-Regular.woff2',
  '/assets/fonts/inter/Inter-Medium.woff2',
  '/assets/fonts/inter/Inter-SemiBold.woff2',
  '/assets/fonts/inter/Inter-Bold.woff2',
  '/assets/fonts/inter/Inter-ExtraBold.woff2',
  '/assets/fonts/inter/Inter-Black.woff2'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('Service Worker: All files cached successfully');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Cache failed:', err);
        // Try to cache files individually
        return caches.open(CACHE_NAME).then(cache => {
          return Promise.allSettled(
            urlsToCache.map(url => 
              cache.add(new Request(url, {cache: 'reload'}))
                .catch(e => console.warn(`Failed to cache ${url}:`, e))
            )
          );
        });
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network and cache the response
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(fetchResponse => {
          // Check if we received a valid response
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response for caching
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            })
            .catch(err => console.warn('Failed to cache:', event.request.url, err));

          return fetchResponse;
        });
      })
      .catch(err => {
        console.error('Service Worker: Fetch failed for:', event.request.url, err);
        
        // For navigation requests, return the main page
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // For other requests, throw the error
        throw err;
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients...');
      return self.clients.claim();
    })
  );
});
