// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'

// No response generic: the store's call site has never had one, and adding it
// here would change inference rather than move code.
export function fetchNotifications() {
  return api.get('/notifications').then((r) => r.data)
}

export function markNotificationRead(id: string) {
  return api.patch(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return api.patch('/notifications/read-all')
}
