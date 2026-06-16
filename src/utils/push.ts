import api from '@/lib/axios'

export async function subscribeToPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await sendSubscriptionToServer(existing)
      return
    }

    const { data } = await api.get('/notifications/vapid-public-key')
    const applicationServerKey = urlBase64ToUint8Array(data.key)

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    await sendSubscriptionToServer(sub)
  } catch {
    // Permission denied or unsupported — silently skip
  }
}

async function sendSubscriptionToServer(sub: PushSubscription) {
  const json = sub.toJSON()
  await api.post('/notifications/push-subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  })
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}
