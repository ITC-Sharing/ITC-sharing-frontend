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
          <NotificationBell v-if="authStore.isAuthenticated" />

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
import NotificationBell from '@/components/NotificationBell.vue'
import { useAuthStore } from '@/stores/auth.store'
import { subscribeToPush } from '@/utils/push'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
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

// ── Click-outside ─────────────────────────────────────────────────────────────
const handleClickOutside = (event: MouseEvent) => {
  if (accountMenuRef.value && !accountMenuRef.value.contains(event.target as Node)) {
    closeAccountMenu()
  }
}

const handleLogout = async () => {
  authStore.logout()
  closeAccountMenu()
  await router.push('/')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (authStore.isAuthenticated) {
    subscribeToPush()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
