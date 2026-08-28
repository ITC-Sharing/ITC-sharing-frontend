<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { useMajorsStore } from '../../stores/majors.store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const majorsStore = useMajorsStore()

/**
 * Registration is three steps, because the account is not created until the
 * student proves they own the address:
 *   1 details  — name, student ID, department, year
 *   2 code     — 6 digits emailed to the derived address
 *   3 password — set it, which is what finally creates the account
 *
 * Backing out to step 1 and submitting again simply reissues a code; the server
 * replaces the in-flight registration rather than erroring.
 */
type Step = 'details' | 'code' | 'password'
const step = ref<Step>('details')

// Mirrors STUDENT_ID_PATTERN in the backend's register.dto.ts. Kept in sync by
// hand — the server is the authority, this only spares a round-trip.
const STUDENT_ID_PATTERN = /^e\d{8}$/i
const STUDENT_EMAIL_DOMAIN = 'dtc1.itc.edu.kh'

const form = reactive({
  firstName: '',
  lastName: '',
  studentId: '',
  major_id: '',
  year_level: '',
  code: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  firstName: '',
  lastName: '',
  studentId: '',
  major_id: '',
  year_level: '',
  code: '',
  password: '',
  confirmPassword: '',
})

// The address is DERIVED, never typed: the whole point of the code is that the
// student cannot choose where it goes. Shown read-only so they can see what it
// resolves to before committing.
const derivedEmail = computed(() => {
  const id = form.studentId.trim().toLowerCase()
  return STUDENT_ID_PATTERN.test(id) ? `${id}@${STUDENT_EMAIL_DOMAIN}` : ''
})

// True once the server has taken the details and sent a code.
const sentTo = ref('')
// False when the server has no SMTP configured — the code was logged, not sent.
const delivered = ref(true)

// ── Resend cooldown (server enforces 60s; this just stops pointless requests)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined
function startCooldown(seconds = 60) {
  cooldown.value = seconds
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}
onBeforeUnmount(() => clearInterval(cooldownTimer))

// The Department of Foreign Languages isn't a department anyone registers
// into — every student takes its courses alongside their own major.
const HIDDEN_MAJORS = ['dfl']
const selectableMajors = computed(() =>
  majorsStore.majors.filter(
    (m) => !HIDDEN_MAJORS.includes(String(m.acronym ?? '').toLowerCase()),
  ),
)

// Foundation students are years 1–2; department students are years 3–5.
const isFoundation = computed(() => {
  const major = majorsStore.majors.find((m) => m.id === form.major_id)
  return major?.acronym?.toLowerCase() === 'foundation'
})
const yearOptions = computed(() => (isFoundation.value ? [1, 2] : [3, 4, 5]))

watch(
  () => form.major_id,
  () => {
    form.year_level = ''
  },
)

onMounted(() => majorsStore.fetchMajors())

const nameRegex = /^[A-Za-zក-៿\s]+$/

function validateFirstName() {
  errors.firstName = !form.firstName
    ? 'auth.register.enterFirstName'
    : !nameRegex.test(form.firstName)
      ? 'auth.register.invaildName'
      : ''
}
function validateLastName() {
  errors.lastName = !form.lastName
    ? 'auth.register.enterLastName'
    : !nameRegex.test(form.lastName)
      ? 'auth.register.invaildName'
      : ''
}
function validateStudentId() {
  errors.studentId = !form.studentId
    ? 'auth.register.emptyStudentId'
    : !STUDENT_ID_PATTERN.test(form.studentId.trim())
      ? 'auth.register.invalidStudentId'
      : ''
}
function validateMajor() {
  errors.major_id = form.major_id ? '' : 'auth.register.enterDepartment'
}
function validateYear() {
  errors.year_level = form.year_level ? '' : 'auth.register.enterYear'
}
function validateCode() {
  errors.code = !form.code
    ? 'auth.register.emptyCode'
    : !/^\d{6}$/.test(form.code)
      ? 'auth.register.invalidCode'
      : ''
}
function validatePassword() {
  errors.password = !form.password
    ? 'auth.register.emptyPassword'
    : form.password.length < 8
      ? 'auth.register.shortPassword'
      : ''
}
function validateConfirmPassword() {
  errors.confirmPassword = !form.confirmPassword
    ? 'auth.register.emptyConfirmPassword'
    : form.password !== form.confirmPassword
      ? 'auth.register.notMatchPassword'
      : ''
}

// ── Step 1 → 2 ────────────────────────────────────────────────────────────
async function submitDetails(e: Event) {
  e.preventDefault()
  validateFirstName()
  validateLastName()
  validateStudentId()
  validateMajor()
  validateYear()
  if ([errors.firstName, errors.lastName, errors.studentId, errors.major_id, errors.year_level].some(Boolean))
    return

  try {
    const result = await authStore.register({
      first_name: form.firstName,
      last_name: form.lastName,
      student_id: form.studentId.trim().toLowerCase(),
      major_id: form.major_id,
      year_level: Number(form.year_level),
    })
    sentTo.value = result.email
    delivered.value = result.delivered
    step.value = 'code'
    startCooldown()
  } catch {
    // authStore.error is shown in the banner
  }
}

// ── Step 2 → 3 ────────────────────────────────────────────────────────────
async function submitCode(e: Event) {
  e.preventDefault()
  validateCode()
  if (errors.code) return

  try {
    await authStore.verifyOtp(form.studentId.trim().toLowerCase(), form.code)
    step.value = 'password'
  } catch {
    // authStore.error is shown in the banner
  }
}

async function resend() {
  if (cooldown.value > 0) return
  try {
    const result = await authStore.resendOtp(form.studentId.trim().toLowerCase())
    delivered.value = result.delivered
    form.code = ''
    startCooldown()
  } catch {
    // authStore.error is shown in the banner
  }
}

// ── Step 3 → done ─────────────────────────────────────────────────────────
async function submitPassword(e: Event) {
  e.preventDefault()
  validatePassword()
  validateConfirmPassword()
  if (errors.password || errors.confirmPassword) return

  try {
    await authStore.setRegistrationPassword(
      form.studentId.trim().toLowerCase(),
      form.code,
      form.password,
    )
    router.push('/auth/login')
  } catch {
    // authStore.error is shown in the banner
  }
}

function backToDetails() {
  step.value = 'details'
  form.code = ''
  errors.code = ''
}
</script>

<template>
  <div class="md:w-180 w-80 h-fit bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-8">
    <h1 class="text-3xl font-bold text-gray-900 text-center">
      {{ t('auth.register.register') }}
    </h1>

    <!-- Step indicator -->
    <div class="mt-5 flex items-center justify-center gap-2">
      <template v-for="(s, i) in (['details', 'code', 'password'] as const)" :key="s">
        <div
          class="h-2 w-2 rounded-full transition-colors"
          :class="
            step === s
              ? 'bg-primary'
              : i < ['details', 'code', 'password'].indexOf(step)
                ? 'bg-primary/40'
                : 'bg-gray-200'
          "
        />
      </template>
    </div>

    <!-- Server error banner -->
    <div v-if="authStore.error" class="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
      <p class="text-red-600 text-sm text-center">{{ authStore.error }}</p>
    </div>

    <!-- ═══ Step 1 — details ═══════════════════════════════════════════════ -->
    <form
      v-if="step === 'details'"
      @submit="submitDetails"
      class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4"
    >
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.firstName') }}</label>
        <input
          @blur="validateFirstName"
          v-model="form.firstName"
          type="text"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          :placeholder="t('auth.register.yourFirstName')"
        />
        <p v-if="errors.firstName" class="mt-1 text-sm text-red-500">{{ t(errors.firstName) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.lastName') }}</label>
        <input
          @blur="validateLastName"
          v-model="form.lastName"
          type="text"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          :placeholder="t('auth.register.yourLastName')"
        />
        <p v-if="errors.lastName" class="mt-1 text-sm text-red-500">{{ t(errors.lastName) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.department') }}</label>
        <select
          v-model="form.major_id"
          @blur="validateMajor"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          :class="form.major_id === '' ? 'text-gray-400' : 'text-gray-900'"
        >
          <option disabled value="">{{ t('auth.register.chooseDepartment') }}</option>
          <option v-for="major in selectableMajors" :key="major.id" :value="major.id">
            {{ major.acronym }}
          </option>
        </select>
        <p v-if="errors.major_id" class="mt-1 text-sm text-red-500">{{ t(errors.major_id) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.year') }}</label>
        <select
          v-model="form.year_level"
          @blur="validateYear"
          :disabled="!form.major_id"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
          :class="form.year_level === '' ? 'text-gray-400' : 'text-gray-900'"
        >
          <option disabled value="">{{ t('auth.register.chooseYear') }}</option>
          <option v-for="y in yearOptions" :key="y" :value="String(y)">
            {{ t('auth.register.yearN', { year: y }) }}
          </option>
        </select>
        <p v-if="errors.year_level" class="mt-1 text-sm text-red-500">{{ t(errors.year_level) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.studentId') }}</label>
        <input
          @blur="validateStudentId"
          v-model="form.studentId"
          type="text"
          autocapitalize="none"
          spellcheck="false"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e20220886"
        />
        <p v-if="errors.studentId" class="mt-1 text-sm text-red-500">{{ t(errors.studentId) }}</p>
        <p v-else class="mt-1.5 text-sm text-gray-400">{{ t('auth.register.studentIdHint') }}</p>
      </div>

      <!-- Filled from the student ID, never typed: a code sent to an address the
           registrant picked would prove nothing. Read-only rather than hidden so
           they can see where the code is going before committing. -->
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.email') }}</label>
        <input
          :value="derivedEmail"
          type="email"
          readonly
          tabindex="-1"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 cursor-not-allowed focus:outline-none"
          :class="derivedEmail ? 'text-gray-900 font-medium' : 'text-gray-400'"
          :placeholder="t('auth.register.emailAuto')"
        />
        <p class="mt-1.5 text-sm text-gray-400">
          {{ derivedEmail ? t('auth.register.codeGoesTo') : t('auth.register.emailFromId') }}
        </p>
      </div>

      <div class="md:col-span-2 mt-2">
        <button
          class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#00749b] active:scale-[0.99] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          :disabled="authStore.loading"
        >
          <span v-if="authStore.loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {{ t('auth.register.sendingCode') }}
          </span>
          <span v-else>{{ t('auth.register.sendCode') }}</span>
        </button>
      </div>
    </form>

    <!-- ═══ Step 2 — the code ══════════════════════════════════════════════ -->
    <form v-else-if="step === 'code'" @submit="submitCode" class="mt-6">
      <p class="text-sm text-gray-600 text-center">
        {{ t('auth.register.codeSentTo') }}
        <span class="font-semibold text-gray-900">{{ sentTo }}</span>
      </p>

      <!-- Only shows on a server with no SMTP, so nobody hunts an inbox in vain -->
      <p v-if="!delivered" class="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
        {{ t('auth.register.mailNotConfigured') }}
      </p>

      <div class="mt-5">
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.code') }}</label>
        <input
          @blur="validateCode"
          v-model="form.code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="000000"
        />
        <p v-if="errors.code" class="mt-1 text-sm text-red-500">{{ t(errors.code) }}</p>
      </div>

      <button
        class="mt-5 w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#00749b] active:scale-[0.99] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? t('auth.register.verifying') : t('auth.register.verify') }}
      </button>

      <div class="mt-4 flex items-center justify-between text-sm">
        <button type="button" class="text-gray-500 hover:text-gray-800 cursor-pointer" @click="backToDetails">
          {{ t('auth.register.back') }}
        </button>
        <button
          type="button"
          class="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          :disabled="cooldown > 0"
          @click="resend"
        >
          {{ cooldown > 0 ? t('auth.register.resendIn', { seconds: cooldown }) : t('auth.register.resend') }}
        </button>
      </div>
    </form>

    <!-- ═══ Step 3 — password ══════════════════════════════════════════════ -->
    <form v-else @submit="submitPassword" class="mt-6">
      <p class="text-sm text-gray-600 text-center">{{ t('auth.register.chooseAPassword') }}</p>

      <div class="mt-5">
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.password') }}</label>
        <input
          @blur="validatePassword"
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          :placeholder="t('auth.register.enterPassword')"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-500">{{ t(errors.password) }}</p>
      </div>

      <div class="mt-4">
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.confirmPassword') }}</label>
        <input
          @blur="validateConfirmPassword"
          v-model="form.confirmPassword"
          type="password"
          autocomplete="new-password"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          :placeholder="t('auth.register.enterConfirmPassword')"
        />
        <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-500">
          {{ t(errors.confirmPassword) }}
        </p>
      </div>

      <button
        class="mt-6 w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-[#00749b] active:scale-[0.99] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        type="submit"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? t('auth.register.creating') : t('auth.register.createAccount') }}
      </button>
    </form>

    <div class="flex justify-center gap-2 mt-6 text-sm text-gray-600">
      <span>{{ t('auth.register.haveAccount') }}</span>
      <RouterLink to="/auth/login" class="font-semibold text-primary hover:underline">
        {{ t('auth.register.login') }}
      </RouterLink>
    </div>
  </div>
</template>
