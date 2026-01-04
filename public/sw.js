// Version - update this on each deployment
const VERSION = 'v' + Date.now();
const CACHE_NAME = `kinpulse-${VERSION}`;

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version:', VERSION);
    self.skipWaiting();
});

// Activate event - claim clients and clear old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating version:', VERSION);

    event.waitUntil(
        (async () => {
            // Clear all old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );

            // Take control of all clients immediately
            await clients.claim();

            // Reload all clients to get fresh content
            const allClients = await clients.matchAll({ type: 'window' });
            allClients.forEach(client => {
                console.log('[SW] Reloading client:', client.url);
                client.navigate(client.url);
            });
        })()
    );
});

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        data: data.url,
        vibrate: [200, 100, 200],
        tag: data.tag || 'notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.data) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});

// Fetch handler - required for PWA installability
self.addEventListener('fetch', (event) => {
    // Let the browser handle all fetch requests normally
    // This is required for PWA installation criteria
    event.respondWith(fetch(event.request));
});

// Periodic update check (every 30 minutes)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_UPDATE') {
        event.waitUntil(self.registration.update());
    }
});

