// Transport only: one function per endpoint, returning the response body.
// Loading flags, error handling and any reshaping stay in the store.
import api from './http'

export function register(payload: {
  first_name: string
  last_name: string
  email: string
  password: string
}) {
  return api.post('/auth/register', payload).then((r) => r.data)
}

/**
 * Mints an access token from the httpOnly refresh cookie. Used after the Google
 * callback, where the cookie is already set and there is nothing to post.
 */
export function refresh() {
  return api.post<{ token: string }>('/auth/refresh').then((r) => r.data)
}

/**
 * Confirm an address with the six-digit code from the sign-up email.
 *
 * The email goes with it: the code is stored under bcrypt, which salts per
 * row, so there is nothing to look a code up by — the address names the row.
 */
export function verifyEmail(email: string, code: string) {
  return api.post('/auth/verify-email', { email, code }).then((r) => r.data)
}

/** Ask for the verification link again. Answers the same for any address. */
export function resendVerification(email: string) {
  return api.post('/auth/resend-verification', { email }).then((r) => r.data)
}

/** Start a password reset. Answers the same for any address. */
export function forgotPassword(email: string) {
  return api.post('/auth/forgot-password', { email }).then((r) => r.data)
}

/**
 * Check a reset code without spending it, so the new-password fields are only
 * shown once the code is known to be right.
 */
export function checkResetCode(email: string, code: string) {
  return api.post('/auth/reset-code/check', { email, code }).then((r) => r.data)
}

/**
 * Finish a password reset with the emailed code.
 *
 * Takes the email for the same reason verifyEmail does: the code is stored
 * under bcrypt, which salts per row, so the address is what names the row.
 * Does not sign in — the caller goes to /auth/login.
 */
export function resetPassword(email: string, code: string, password: string) {
  return api.post('/auth/reset-password', { email, code, password }).then((r) => r.data)
}

export function login(email: string, password: string) {
  return api.post('/auth/login', { email, password }).then((r) => r.data)
}

export function fetchMe() {
  return api.get('/users/me').then((r) => r.data)
}

export function updateMe(payload: Record<string, unknown>) {
  return api.patch('/users/me', payload).then((r) => r.data)
}

/** Takes the already-built FormData — assembling it stays in the store. */
export function uploadAvatar(formData: FormData) {
  return api
    .post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}

/** Revokes the refresh token and clears the cookie. */
export function logout() {
  return api.post('/auth/logout')
}
