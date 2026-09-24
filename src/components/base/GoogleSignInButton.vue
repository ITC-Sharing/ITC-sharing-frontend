<script setup lang="ts">
/**
 * Starts the Google redirect flow.
 *
 * A plain link, not a script-driven widget: the whole point of this flow is a
 * top-level navigation to the backend, which redirects on to Google. Nothing
 * from Google is loaded into this page, so there is no origin to authorise —
 * Google only checks the callback URL, which is the backend's.
 */
const apiUrl = import.meta.env.VITE_API_URL as string

function start() {
  // Full page navigation, deliberately: an XHR here would be blocked by
  // Google's cross-origin rules and the user would never see the consent screen.
  window.location.href = `${apiUrl}/auth/google`
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:cursor-pointer hover:bg-gray-50"
    @click="start"
  >
    <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.88Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.29a12 12 0 0 0 0 10.78l3.98-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l3.98 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
    Continue with Google
  </button>
</template>
