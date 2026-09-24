<template>
  <div>
    <NavBar />
    <main class="pt-25">
      <RouterView />
    </main>

    <CompleteProfileModal v-if="showPrompt" @saved="dismiss" @dismiss="dismiss" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/layout/NavBar.vue'
import CompleteProfileModal from '@/components/base/CompleteProfileModal.vue'
import { RouterView } from 'vue-router'
import { useCompleteProfile } from '@/composables/useCompleteProfile'

const route = useRoute()
const { needsProfile, manuallyOpened, dismissedForSession, dismiss } = useCompleteProfile()

/**
 * Pages whose content is filtered by the viewer's department and year. Landing
 * on one without those set means seeing a partial list with no explanation, so
 * this is where we ask for them.
 */
const AUDIENCE_ROUTES = new Set([
  'documents',
  'department',
  'subjects',
  'subject-documents',
  'level-documents',
])

const showPrompt = computed(() => {
  if (!needsProfile.value) return false
  // A link asked for it, so show it even after an earlier "Not now".
  if (manuallyOpened.value) return true
  return !dismissedForSession.value && AUDIENCE_ROUTES.has(String(route.name ?? ''))
})
</script>
