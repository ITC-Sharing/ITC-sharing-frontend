self.addEventListener('push', (event) => {
  let data = { title: 'ITC Sharing', body: 'You have a new notification', url: '/inbox' }
  try {
    data = event.data?.json() ?? data
  } catch {
    data.body = event.data?.text() ?? data.body
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/inbox'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
