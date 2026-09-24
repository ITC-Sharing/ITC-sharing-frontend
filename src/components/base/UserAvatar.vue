<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Profile photo with an initials fallback.
 *
 * Two things the plain `<img v-if="avatar_url">` it replaces got wrong:
 *
 *  - Google profile photos (lh3.googleusercontent.com) are served 403 when a
 *    Referer header is sent, so they need referrerpolicy="no-referrer". Without
 *    it every Google-created account shows a broken image.
 *  - A URL that fails for any other reason left a broken-image icon, because
 *    the initials only appeared when the URL was absent, not when it failed.
 */
const props = defineProps<{
  src?: string | null
  initials: string
  /** Tailwind text size for the initials, e.g. 'text-xs'. */
  textClass?: string
}>()

const failed = ref(false)
// A new photo deserves a fresh attempt; otherwise one failure is permanent.
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    alt=""
    referrerpolicy="no-referrer"
    class="h-full w-full object-cover"
    @error="failed = true"
  />
  <span v-else :class="['font-bold text-primary', textClass ?? 'text-xs']">{{ initials }}</span>
</template>
