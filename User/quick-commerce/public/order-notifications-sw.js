self.addEventListener('push', event => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch { message = { body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(message.title || 'Order update', {
    body: message.body || 'There is an update about your order.',
    icon: '/wepzo-favicon.svg',
    badge: '/wepzo-favicon.svg',
    tag: message.tag || `order-${Date.now()}`,
    renotify: true,
    vibrate: [220, 100, 220, 100, 320],
    data: { url: message.url || '/account/orders' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/account/orders', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});
