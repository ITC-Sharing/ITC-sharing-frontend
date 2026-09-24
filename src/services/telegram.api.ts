// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the caller.
import api from './http'

export interface TelegramStatus {
  connected: boolean
  linked_at: string | null
  /** False when the server has no bot configured — nothing to connect to. */
  available: boolean
}

export interface TelegramLink {
  /** t.me deep link carrying a single-use token. The bot token stays server-side. */
  url: string
  expires_at: string
}

export function fetchTelegramStatus(): Promise<TelegramStatus> {
  return api.get('/telegram/status').then((r) => r.data)
}

export function createTelegramLink(): Promise<TelegramLink> {
  return api.post('/telegram/link-token').then((r) => r.data)
}

export function disconnectTelegram() {
  return api.delete('/telegram/link').then((r) => r.data)
}
