<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'

/**
 * Where the backend drops the browser after a successful Google sign-in.
 *
 * The session is already established — it is sitting in the httpOnly refresh
 * cookie the callback set. All that is left is to trade it for an access token
 * and load the profile. Nothing sensitive travels in the URL.
 */
const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  try {
    await auth.resumeSession()
    router.replace(auth.user?.role?.toLowerCase() === 'admin' ? { name: 'admin' } : '/')
  } catch {
    router.replace('/auth/login?google_error=session_failed')
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-20">
    <LoadingSpinner />
  </div>
</template>
