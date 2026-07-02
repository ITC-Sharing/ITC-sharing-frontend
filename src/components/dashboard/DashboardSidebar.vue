<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useBooksStore } from '@/stores/books.store'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const booksStore = useBooksStore()

const greetingName = computed(() => auth.user?.first_name || 'there')
const userInitials = computed(
  () =>
    ((auth.user?.first_name?.[0] ?? '') + (auth.user?.last_name?.[0] ?? '')).toUpperCase() || 'U',
)

type DashboardTab = 'dashboard' | 'dashboard-documents' | 'dashboard-books'

const navItems = computed<{ name: DashboardTab; label: string }[]>(() => [
  { name: 'dashboard', label: t('dashboard.sidebar.nav.activity') },
  { name: 'dashboard-documents', label: t('dashboard.sidebar.nav.documents') },
  { name: 'dashboard-books', label: t('dashboard.sidebar.nav.books') },
])

const pendingIncomingCount = computed(() => booksStore.bookStats.pendingIncoming)

const bookFilters = computed(() => [
  { value: 'request', label: t('dashboard.sidebar.filters.request') },
  { value: 'yourBook', label: t('dashboard.sidebar.filters.yourBook') },
  { value: 'donated', label: t('dashboard.sidebar.filters.donated') },
  { value: 'received', label: t('dashboard.sidebar.filters.received') },
  { value: 'requesting', label: t('dashboard.sidebar.filters.requesting') },
])

const currentBookFilter = computed(() => (route.query.filter as string) || 'request')
const booksNavOpen = ref(route.name === 'dashboard-books')

function toggleBooksNav() {
  booksNavOpen.value = !booksNavOpen.value
}

function onNavClick(name: DashboardTab) {
  if (name === 'dashboard-books' && route.name === 'dashboard-books') {
    booksNavOpen.value = !booksNavOpen.value
    return
  }
  router.push({ name })
  if (name === 'dashboard-books') booksNavOpen.value = true
}

function onFilterClick(value: string) {
  router.push({ name: 'dashboard-books', query: { filter: value } })
}
</script>

<template>
  <aside class="w-full md:w-60 shrink-0 md:sticky md:top-[100px] flex flex-col gap-4">
    <!-- Profile card -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div class="h-11 w-11 rounded-full bg-[#008CB9] flex items-center justify-center shrink-0 overflow-hidden">
        <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" class="h-full w-full object-cover" />
        <span v-else class="text-white text-sm font-bold">{{ userInitials }}</span>
      </div>
      <div class="min-w-0">
        <p class="text-sm font-bold text-gray-900 truncate">{{ auth.fullName || greetingName }}</p>
        <p class="text-[11px] text-gray-400 truncate">{{ auth.user?.email }}</p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="bg-white rounded-2xl border border-gray-100 p-2 flex flex-col gap-1">
      <template v-for="item in navItems" :key="item.name">
        <button
          @click="onNavClick(item.name)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
            route.name === item.name
              ? 'bg-[#008CB9] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
          ]"
        >
          <svg
            v-if="item.name === 'dashboard'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <svg
            v-else-if="item.name === 'dashboard-documents'"
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <svg
            v-else
            class="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span class="flex-1">{{ item.label }}</span>
          <span
            v-if="item.name === 'dashboard-books' && pendingIncomingCount"
            :class="[
              'h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
              route.name === 'dashboard-books' ? 'bg-white/30 text-white' : 'bg-red-500 text-white',
            ]"
            >{{ pendingIncomingCount }}</span
          >
          <span
            v-if="item.name === 'dashboard-books'"
            role="button"
            @click.stop="toggleBooksNav"
            class="p-0.5 -m-0.5 rounded shrink-0 hidden md:block"
          >
            <svg
              class="h-3.5 w-3.5 transition-transform"
              :class="route.name === 'dashboard-books' && booksNavOpen ? 'rotate-90' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>


        <!-- Books sub-nav (desktop only — mobile uses the in-page filter tabs) -->
        <div
          v-if="item.name === 'dashboard-books' && route.name === 'dashboard-books' && booksNavOpen"
          class="hidden md:flex flex-col gap-1 pl-4 mt-0.5"
        >
          <button
            v-for="filter in bookFilters"
            :key="filter.value"
            @click="onFilterClick(filter.value)"
            :class="[
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors',
              currentBookFilter === filter.value
                ? 'bg-[#008CB9]/10 text-[#008CB9] font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ]"
          >
            <span class="flex-1">{{ filter.label }}</span>
            <span
              v-if="filter.value === 'request' && pendingIncomingCount"
              :class="[
                'h-4.5 min-w-4.5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                currentBookFilter === 'request' ? 'bg-[#008CB9] text-white' : 'bg-red-500 text-white',
              ]"
              >{{ pendingIncomingCount }}</span
            >
          </button>
        </div>
      </template>
    </nav>
  </aside>
</template>
