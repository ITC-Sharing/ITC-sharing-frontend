<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBooksStore } from '@/stores/books.store'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const booksStore = useBooksStore()

const currentLabel = computed(() => {
  const key = route.name as string
  return key ? t(`dashboard.mobileTitle.${key}`) : ''
})

// The sidebar badge needs the pending-request count on every tab; each child
// route fetches only the data its own view requires.
onMounted(() => {
  booksStore.fetchBookStats()
})
</script>

<template>
  <div class="min-h-screen bg-[#F7F8FA]">
    <div class="mx-auto max-w-7xl px-6 flex flex-col md:flex-row gap-6 items-start">
      <DashboardSidebar />

      <!-- ── Content ──────────────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col gap-6">
        <!-- Mobile title -->
        <div class="md:hidden">
          <h1 class="text-xl font-bold text-gray-900">{{ currentLabel }}</h1>
        </div>

        <router-view />
      </div>
    </div>
  </div>
</template>
