import axios from 'axios'

/**
 * The message an API error carries, or a fallback.
 *
 * Every store used to write `catch (e: any)` and reach straight for
 * `e.response?.data?.message`. That is `any` doing real harm rather than
 * cosmetic harm: a typo like `e.reponse` type-checks, compiles, and silently
 * shows the fallback for every error forever.
 *
 * A caught value is `unknown` in TypeScript because a throw can carry anything
 * — a string, an object, null. So this narrows rather than asserts: it asks
 * axios whether the value is one of its errors, and only then reads the body.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined
    const message = data?.message

    // The API's own shape: { success: false, message: string }.
    if (typeof message === 'string' && message.trim()) return message

    /**
     * A validation failure returns an ARRAY — class-validator emits one string
     * per broken rule. Only one call site handled that; the rest assigned the
     * array straight into a string ref, which `any` let through and which would
     * have rendered as "field must be longer,field is required" or worse.
     */
    if (Array.isArray(message)) {
      const parts = message.filter((m): m is string => typeof m === 'string')
      if (parts.length) return parts.join(', ')
    }
    // No body — a timeout, a refused connection, a CORS failure. Axios's own
    // message is more useful than a generic string.
    if (!error.response && error.message) return error.message
  }
  return fallback
}
