import { ref } from 'vue'

/**
 * The access token, and where it is kept: memory.
 *
 * It used to live in localStorage, which made every XSS a session theft rather
 * than a page defacement — any script running on the page could read it, and it
 * outlived the tab that leaked it. Held here it dies with the page, and the
 * httpOnly refresh cookie mints a new one on the next load (auth store
 * `init()`). That is the whole cost of this: one round trip per cold load.
 *
 * It is not a cure for XSS. Script executing in the page can still import this
 * module and spend the token for as long as the tab is open. What it removes is
 * everything that is not live script execution — a readable, persistent
 * credential sitting in a store that survives the session, shared with every
 * other script the page ever loads.
 *
 * A standalone module rather than state inside the auth store because http.ts
 * both reads the token and replaces it on refresh, and the store imports
 * http.ts (via auth.api) — reaching back the other way would be a cycle.
 */
const accessToken = ref<string | null>(null)

/**
 * Whether this browser has a session worth trying to restore.
 *
 * Not a credential and not trusted as one — the server decides, and the refresh
 * cookie is the only thing it reads. This exists so a signed-out visitor
 * reading the public pages does not spend a `POST /auth/refresh` on every load
 * to be told what was already known.
 */
const SESSION_HINT = 'itc.session'

/**
 * Migration, run once per browser at load.
 *
 * Builds before this change persisted the access token under `token`. Two
 * things have to happen to it: it has to go — it is a live credential, readable
 * until it expires, and the session it belongs to is re-minted from the cookie
 * anyway — and the fact that someone was signed in has to survive, or the
 * deploy signs out every existing user in exchange for a login they should
 * never have noticed.
 */
const legacyToken = localStorage.getItem('token')
if (legacyToken !== null) {
  localStorage.setItem(SESSION_HINT, '1')
  localStorage.removeItem('token')
}

export { accessToken }

export function setAccessToken(token: string): void {
  accessToken.value = token
  localStorage.setItem(SESSION_HINT, '1')
}

export function clearAccessToken(): void {
  accessToken.value = null
  localStorage.removeItem(SESSION_HINT)
}

export function hadSession(): boolean {
  return localStorage.getItem(SESSION_HINT) === '1'
}
