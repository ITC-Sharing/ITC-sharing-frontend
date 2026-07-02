<script lang="ts" setup>
import { reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

interface Form {
  email: string
  password: string
}

interface Errors {
  email: string
  password: string
}

const form = reactive<Form>({
  email: '',
  password: '',
})

const errors = reactive<Errors>({
  email: '',
  password: '',
})

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    errors.email = 'auth.login.emptyEmail'
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'auth.login.invaildEmail'
  } else {
    errors.email = ''
  }
}

const validatePassword = () => {
  if (!form.password) {
    errors.password = 'auth.login.emptyPassword'
  } else if (form.password.length < 8) {
    errors.password = 'auth.login.shortPassword'
  } else {
    errors.password = ''
  }
}

const submitForm = async (e: Event) => {
  e.preventDefault()
  validateEmail()
  validatePassword()

  const hasErrors = Object.values(errors).some((error) => error)
  if (hasErrors) return

  try {
    await authStore.login(form.email, form.password)
    if (authStore.user?.role?.toLowerCase() === 'admin') {
      router.push({ name: 'admin' })
    } else {
      router.push('/')
    }
  } catch {
    // authStore.error is already set, shown in the banner below
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div class="md:w-115 w-80 h-fit bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-8">
      <h1 class="text-3xl font-bold text-gray-900 text-center">{{ t('auth.login.login') }}</h1>

      <!-- Server error banner -->
      <div v-if="authStore.error" class="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
        <p class="text-red-600 text-sm text-center">{{ authStore.error }}</p>
      </div>

      <form @submit="submitForm" class="mt-6 flex flex-col gap-4">
        <div>
          <label for="email" class="text-sm font-semibold text-gray-600">{{ t('auth.login.email') }}</label>
          <input
            @blur="validateEmail"
            id="email"
            name="email"
            :placeholder="t('auth.login.enterEmail')"
            v-model="form.email"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          />
          <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ t(errors.email) }}</p>
        </div>

        <div>
          <label for="password" class="text-sm font-semibold text-gray-600">{{ t('auth.login.password') }}</label>
          <input
            @blur="validatePassword"
            type="password"
            id="password"
            name="password"
            :placeholder="t('auth.login.enterPassword')"
            v-model="form.password"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          />
          <div class="mt-1 flex items-center justify-between gap-2">
            <p class="text-sm text-red-500">{{ errors.password ? t(errors.password) : '' }}</p>
            <span class="text-sm text-[#008CB9] hover:underline cursor-pointer shrink-0">{{ t('auth.login.forgotPassword') }}</span>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="w-full py-3 mt-1 text-white rounded-xl bg-[#008CB9] cursor-pointer hover:bg-[#00749b] active:scale-[0.99] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="authStore.loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ t('auth.login.login') }}...
          </span>
          <span v-else>{{ t('auth.login.login') }}</span>
        </button>

        <div class="flex justify-center gap-2 text-sm text-gray-600">
          <span>{{ t('auth.login.dontHaveAccount') }}</span>
          <RouterLink to="/auth/register" class="font-semibold text-[#008CB9] hover:underline">{{ t('auth.login.register') }}</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>