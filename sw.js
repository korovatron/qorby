// sw.js
// Change the cache name when updating to cause cache refresh on progressive web apps

const CACHE_NAME = 'qorby-cache-2025-08-21-18:57';
const FILES_TO_CACHE = [
  '/qorby/',
  '/qorby/index.html',
  'index.html',
  'howler.min.js',
  'main.js',
  'images/qorbyTitle.png',
  'Game.js',
  'InputManager.js',
  'sounds/qorbyAudioSprite.ogg',
  'sounds/qorbyAudioSprite.m4a',
  'sounds/qorbyAudioSprite.mp3',
  'sounds/qorbyAudioSprite.ac3'
];

// Install & cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
          console.log('✅ Cached:', file);
        } catch (err) {
          console.warn('❌ Failed to cache:', file, err);
        }
      }
    })
  );
});

// Activate & remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await clients.claim(); // <-- this is the correct usage
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })()
  );
});


// Serve cached files or fetch from network
self.addEventListener('fetch', event => {
  // Always fetch fresh for HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/qorby/index.html'))
    );
    return;
  }

  // Otherwise serve from cache or fall back to network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
