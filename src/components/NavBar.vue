<template>
  <nav class="bg-white shadow-sm fixed top-0 left-0 w-full z-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between py-4 relative">
        <!-- Left Section -->
        <div class="flex items-center">
          <!-- Mobile Menu Button -->
          <button @click="toggleMenu" class="md:hidden text-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6 w-8 h-8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <!-- Desktop Logo -->
          <router-link to="/" class="hidden md:block text-xl font-bold">Logo</router-link>
        </div>

        <!-- Center Section -->
        <!-- Mobile Logo -->
        <router-link
          to="/"
          class="md:hidden absolute left-1/2 transform -translate-x-1/2 text-xl font-bold"
          >Logo</router-link
        >

        <!-- Desktop Menu -->
        <ul
          class="hidden md:flex gap-8 font-semibold text-black text-lg absolute left-1/2 transform -translate-x-1/2"
        >
          <router-link to="/" class="hover:text-[#008CB9]">{{ t('common.nav.home') }}</router-link>
          <router-link to="/documents" class="hover:text-[#008CB9]">{{
            t('common.nav.docs')
          }}</router-link>
          <router-link to="/books" class="hover:text-[#008CB9]">{{
            t('common.nav.books')
          }}</router-link>
        </ul>

        <!-- Right Section -->
        <div class="flex items-center gap-3">
          <div
            class="relative w-18 h-8 bg-gray-200 rounded-full flex items-center cursor-pointer"
            @click="toggleLang"
          >
            <!-- Sliding background -->
            <div
              class="absolute top-0 left-0 h-8 w-1/2 bg-[#008CB9] rounded-full transition-all duration-300"
              :class="isKm ? 'translate-x-full' : 'translate-x-0'"
            ></div>

            <!-- Labels -->
            <div class="flex w-full z-10 text-sm font-semibold">
              <div class="w-1/2 text-center" :class="!isKm ? 'text-white' : 'text-gray-600'">
                EN
              </div>
              <div class="w-1/2 text-center" :class="isKm ? 'text-white' : 'text-gray-600'">KH</div>
            </div>
          </div>
          <!-- ── Notification bell ──────────────────────────────────────── -->
          <div v-if="authStore.isAuthenticated" ref="notifRef" class="relative">
            <button
              type="button"
              @click.stop="toggleNotif"
              class="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span
                v-if="notifStore.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              >{{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}</span>
            </button>

            <!-- Dropdown -->
            <div
              v-if="notifOpen"
              class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p class="text-sm font-semibold text-gray-900">Notifications</p>
                <button
                  v-if="notifStore.unreadCount > 0"
                  @click="handleMarkAllRead"
                  class="text-xs text-[#0057BD] hover:underline"
                >Mark all read</button>
              </div>

              <!-- List -->
              <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
                <div v-if="notifStore.loading" class="flex justify-center py-8">
                  <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </div>

                <div
                  v-else-if="notifStore.notifications.length === 0"
                  class="py-10 text-center text-sm text-gray-400"
                >No notifications yet.</div>

                <button
                  v-else
                  v-for="n in notifStore.notifications"
                  :key="n.id"
                  @click="handleMarkRead(n.id)"
                  :class="[
                    'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50',
                    !n.is_read ? 'bg-blue-50/60' : '',
                  ]"
                >
                  <span class="text-base mt-0.5 shrink-0">{{ notifIcon(n.type) }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-800 leading-snug">{{ n.message }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ timeAgo(n.created_at) }}</p>
                  </div>
                  <span v-if="!n.is_read" class="mt-1.5 h-2 w-2 rounded-full bg-[#0057BD] shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <!-- ── Account menu ───────────────────────────────────────────── -->
          <div v-if="authStore.isAuthenticated" ref="accountMenuRef" class="relative">
            <button
              type="button"
              @click="toggleAccountMenu"
              class="flex items-center"
              aria-label="Open account menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8">
                <path
                  d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"
                />
              </svg>
            </button>

            <div
              v-if="isAccountMenuOpen"
              class="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
            >
              <div class="px-4 py-2 border-b border-gray-100 text-sm text-gray-700">
                {{ authStore.fullName || 'Account' }}
              </div>
              <button
                type="button"
                @click="() => { router.push({ name: 'dashboard' }); closeAccountMenu() }"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Dashboard
              </button>
              <button
                type="button"
                class="block w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                disabled
              >
                Settings
              </button>
              <button
                type="button"
                @click="handleLogout"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>

          <template v-else>
            <RouterLink to="/auth/login">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                class="w-8 h-8 md:hidden"
              >
                <path
                  d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"
                />
              </svg>
            </RouterLink>

            <RouterLink to="/auth/login">
              <ButtonPrimary :text="t('common.nav.login')" class="hidden md:block" />
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isOpen" class="md:hidden px-6 pb-4">
      <ul class="flex flex-col gap-4 font-semibold text-gray-800">
        <router-link to="/">{{ t('common.nav.home') }}</router-link>
        <router-link to="/documents">{{ t('common.nav.docs') }}</router-link>
        <router-link to="/books">{{ t('common.nav.books') }}</router-link>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ButtonPrimary from '@/components/ButtonPrimary.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const router = useRouter()

// ✅ better init
const isKm = ref(locale.value === 'km')

const toggleLang = () => {
  const newLang = isKm.value ? 'en' : 'km'
  isKm.value = !isKm.value

  locale.value = newLang
  localStorage.setItem('lang', newLang)
}

watch(locale, (val) => {
  isKm.value = val === 'km'
})

const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const isAccountMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)

const toggleAccountMenu = () => {
  isAccountMenuOpen.value = !isAccountMenuOpen.value
}

const closeAccountMenu = () => {
  isAccountMenuOpen.value = false
}

// ── Notifications ──────────────────────────────────────────────────────────────
const notifOpen = ref(false)
const notifRef = ref<HTMLElement | null>(null)

function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) notifStore.fetch()
}

function closeNotif() {
  notifOpen.value = false
}

async function handleMarkRead(id: string) {
  await notifStore.markRead(id)
}

async function handleMarkAllRead() {
  await notifStore.markAllRead()
}

function notifIcon(type: string) {
  if (type.includes('approved')) return '✅'
  if (type.includes('rejected')) return '❌'
  return '🔔'
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Click-outside (covers both menus) ─────────────────────────────────────────
const handleClickOutside = (event: MouseEvent) => {
  if (accountMenuRef.value && !accountMenuRef.value.contains(event.target as Node)) {
    closeAccountMenu()
  }
  if (notifRef.value && !notifRef.value.contains(event.target as Node)) {
    closeNotif()
  }
}

const handleLogout = async () => {
  authStore.logout()
  closeAccountMenu()
  await router.push('/')
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (authStore.isAuthenticated) notifStore.fetch()
  }, 15_000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated) {
    notifStore.fetch()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (authStore.isAuthenticated) {
    notifStore.fetch()
    startPolling()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopPolling()
})

watch(
  () => authStore.isAuthenticated,
  (authed) => {
    if (authed) { notifStore.fetch(); startPolling() }
    else stopPolling()
  },
)
</script>
