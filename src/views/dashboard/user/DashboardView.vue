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
  <!-- The palette lives here as custom properties rather than being hardcoded
       across four files: children inherit them through the DOM, so retheming
       the dashboard (or swapping the red for the brand teal) is one block. -->
  <div class="dash-root min-h-screen bg-[var(--dash-bg)]">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row gap-6 items-start">
      <DashboardSidebar />

      <!-- ── Content ──────────────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col gap-6">
        <!-- Mobile title -->
        <div class="md:hidden">
          <h1 class="text-xl font-bold text-[var(--dash-text)]">{{ currentLabel }}</h1>
        </div>

        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Scoped, but custom properties inherit down the tree, so every descendant —
 * including child components — reads them. Change the accent in one place.
 */
.dash-root {
  --dash-bg: #f7f8fa;
  --dash-card: #ffffff;
  --dash-border: #eef0f3;
  --dash-border-hover: #dfe3e9;
  --dash-text: #111827;
  --dash-muted: #9ca3af;
  /* The existing brand teal, not a new accent colour. */
  --dash-accent: var(--color-primary);
  --dash-sidebar: #ffffff;
  /* Row hover inside panels — a tint, not a new colour. */
  --dash-row-hover: #f9fafb;
}
</style>
