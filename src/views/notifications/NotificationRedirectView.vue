<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'

/**
 * Where a notification link from outside the app lands: /n/:id.
 *
 * Telegram messages carry this URL rather than a real destination, because the
 * rule for where a notification goes is not simple — an accepted request opens
 * its progress panel, an approved subject needs its department and year looked
 * up first. Encoding that in the message would mean a second copy of the
 * mapping, in another language, free to drift from this one.
 *
 * So the server sends an id and the app decides, through exactly the path a
 * click on the bell takes — which also marks it read on the way.
 */
const route = useRoute()
const router = useRouter()
const { notifStore, handleNotifClick } = useNotifications()

onMounted(async () => {
  const id = String(route.params.id ?? '')
  if (!id) {
    await router.replace({ name: 'notifications' })
    return
  }

  // The list is the only place a notification can be read from, so it has to be
  // in hand before one can be found.
  if (!notifStore.notifications.length) await notifStore.fetch()
  const found = notifStore.notifications.find((n) => n.id === id)

  // Deleted, or belonging to somebody else: the full list is the honest answer,
  // rather than an error about something the reader cannot act on.
  if (!found) {
    await router.replace({ name: 'notifications' })
    return
  }

  await handleNotifClick(found)
})
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <LoadingSpinner />
  </div>
</template>
