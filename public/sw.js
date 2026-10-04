const CACHE_NAME = 'paisawise-shell-v1'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add('/'))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedShell = await caches.match('/')
      if (cachedShell) return cachedShell
      throw new Error('PaisaWise is offline and its app shell is not cached.')
    }),
  )
})
