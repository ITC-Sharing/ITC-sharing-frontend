<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import CodeInput from '@/components/base/CodeInput.vue'
import { useCountdown } from '@/composables/useCountdown'

/**
 * Confirm an address with the code from the sign-up email.
 *
 * Reachable two ways: straight after registering (the register screen hands
 * the address over in the query string) and cold, by someone who closed the
 * tab and came back. The second case is why the address is a field here rather
 * than assumed — without it there is nothing to compare the code against, and
 * making them register again to get a form would be absurd.
 */
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref(String(route.query.email ?? ''))
const code = ref('')
const resent = ref('')
const {
  formatted: codeLeft,
  expired: codeExpired,
  running: timerRunning,
  start: startCodeTimer,
} = useCountdown()

async function submit() {
  if (code.value.length !== 6 || !email.value.trim()) return
  resent.value = ''
  try {
    await auth.verifyEmail(email.value.trim().toLowerCase(), code.value)
    // Confirming signs you in, so there is nothing left to do on this screen.
    router.push('/')
  } catch {
    // Wrong, expired, or out of attempts — auth.error says which, and each
    // needs a different response from the reader. Clear the boxes either way
    // so the next code can just be typed.
    code.value = ''
  }
}

async function resend() {
  resent.value = ''
  code.value = ''
  try {
    const again = await auth.resendVerification(email.value.trim().toLowerCase())
    resent.value = again.message
    startCodeTimer(again.expires_in)
  } catch {
    // auth.error is shown in the banner
  }
}

const codeInput = ref<InstanceType<typeof CodeInput> | null>(null)
onMounted(() => {
  if (email.value) codeInput.value?.focus()
})
</script>

<template>
  <div class="md:w-120 w-80 h-fit bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-8">
    <h1 class="text-2xl font-bold text-center text-gray-900">
      {{ t('auth.verify.title') }}
    </h1>
    <p class="mt-3 text-center text-gray-600">{{ t('auth.verify.lead') }}</p>

    <div v-if="auth.error" class="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
      <p class="text-center text-sm text-red-600">{{ auth.error }}</p>
    </div>
    <div v-if="resent" class="mt-5 rounded-xl border border-green-200 bg-green-50 p-3">
      <p class="text-center text-sm text-green-700">{{ resent }}</p>
    </div>

    <form @submit.prevent="submit" class="mt-6 flex flex-col gap-4">
      <!-- Shown only when we were not told who this is. Arriving from the
             register screen, the address is already known and repeating it
             back as an editable field just invites a typo. -->
      <div v-if="!String(route.query.email ?? '')">
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.verify.email') }}</label>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:outline-none"
          :placeholder="t('auth.verify.yourEmail')"
        />
      </div>
      <p v-else class="text-center text-sm text-gray-500">
        {{ t('auth.verify.sentTo') }}
        <span class="font-semibold text-gray-900">{{ email }}</span>
      </p>

      <CodeInput ref="codeInput" v-model="code" :disabled="auth.loading" @complete="submit" />

      <button
        type="submit"
        :disabled="auth.loading || code.length !== 6 || codeExpired"
        class="rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-50"
      >
        {{ auth.loading ? t('auth.verify.checking') : t('auth.verify.confirm') }}
      </button>
    </form>

    <!-- The ticking window is only shown once a code was sent from this
         screen. Arriving cold, the code was issued elsewhere and its
         remaining time is not knowable here — so say the rule instead. -->
    <p v-if="codeExpired" class="mt-5 text-center text-sm text-red-500">
      {{ t('auth.verify.codeExpired') }}
    </p>
    <p v-else-if="timerRunning" class="mt-5 text-center text-sm text-gray-500">
      {{ t('auth.verify.expiresIn') }}
      <span class="font-semibold tabular-nums text-gray-700">{{ codeLeft }}</span>
    </p>
    <p v-else class="mt-5 text-center text-sm text-gray-500">
      {{ t('auth.verify.expiry') }}
    </p>

    <div class="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        class="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
        :disabled="auth.loading || !email.trim()"
        @click="resend"
      >
        {{ t('auth.verify.resend') }}
      </button>
      <RouterLink to="/auth/login" class="text-sm text-gray-500 hover:underline">
        {{ t('auth.verify.backToLogin') }}
      </RouterLink>
    </div>
  </div>
</template>
