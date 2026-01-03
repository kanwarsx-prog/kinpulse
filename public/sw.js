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

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.data) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Add fetch handler for PWA installability
self.addEventListener('fetch', (event) => {
    // Let the browser handle all fetch requests normally
    // This is required for PWA installation criteria
    event.respondWith(fetch(event.request));
});
