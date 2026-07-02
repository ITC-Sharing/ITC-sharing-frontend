<script setup lang="ts">
import { computed, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { useMajorsStore } from '../stores/majors.store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const majorsStore = useMajorsStore()

interface Form {
  firstName: string
  lastName: string
  major_id: string
  year_level: string
  email: string
  password: string
  confirmPassword: string
}

interface Errors {
  firstName: string
  lastName: string
  major_id: string   // ← was "skill"
  year_level: string
  email: string
  password: string
  confirmPassword: string
}

const form = reactive<Form>({
  firstName: '',
  lastName: '',
  major_id: '',
  year_level: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive<Errors>({
  firstName: '',
  lastName: '',
  major_id: '',
  year_level: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// English & French aren't offered for self-registration.
const HIDDEN_MAJORS = ['english', 'french']
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

const yearOptions = computed(() =>
  isFoundation.value ? [1, 2] : [3, 4, 5],
)

// Reset the chosen year when the major changes (valid range differs)
watch(
  () => form.major_id,
  () => {
    form.year_level = ''
  },
)

// Load majors from API when page mounts
onMounted(() => {
  majorsStore.fetchMajors()
})

const nameRegex = /^[A-Za-z\u1780-\u17FF\s]+$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateFirstName() {
  if (!form.firstName) {
    errors.firstName = 'auth.register.enterFirstName'
  } else if (!nameRegex.test(form.firstName)) {
    errors.firstName = 'auth.register.invaildName'
  } else {
    errors.firstName = ''
  }
}

function validateLastName() {
  if (!form.lastName) {
    errors.lastName = 'auth.register.enterLastName'
  } else if (!nameRegex.test(form.lastName)) {
    errors.lastName = 'auth.register.invaildName'
  } else {
    errors.lastName = ''
  }
}

function validateEmail() {
  if (!form.email) {
    errors.email = 'auth.register.emptyEmail'
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'auth.register.invaildEmail'
  } else {
    errors.email = ''
  }
}

function validatePassword() {
  if (!form.password) {
    errors.password = 'auth.register.emptyPassword'
  } else if (form.password.length < 8) {
    errors.password = 'auth.register.shortPassword'
  } else {
    errors.password = ''
  }
}

function validateConfirmPassword() {
  if (!form.confirmPassword) {
    errors.confirmPassword = 'auth.register.emptyConfirmPassword'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'auth.register.notMatchPassword'
  } else {
    errors.confirmPassword = ''
  }
}

function validateMajor() {
  if (!form.major_id) {
    errors.major_id = 'auth.register.enterDepartment'
  } else {
    errors.major_id = ''
  }
}

function validateYear() {
  if (!form.year_level) {
    errors.year_level = 'auth.register.enterYear'
  } else {
    errors.year_level = ''
  }
}

async function submitForm(e: Event) {
  e.preventDefault()

  validateFirstName()
  validateLastName()
  validateEmail()
  validatePassword()
  validateConfirmPassword()
  validateMajor()
  validateYear()

  const hasError = Object.values(errors).some((error) => error !== '')
  if (hasError) return

  try {
    await authStore.register({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      password: form.password,
      major_id: form.major_id,
      year_level: Number(form.year_level),
    })

    // Success — go to login
    router.push('/auth/login')

  } catch {
    // authStore.error is already set, shown in template below
  }
}
</script>

<template>
  <div class="md:w-180 w-80 h-fit bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-8">
    <h1 class="text-3xl font-bold text-gray-900 text-center">
      {{ t('auth.register.register') }}
    </h1>

    <!-- Server error banner -->
    <div v-if="authStore.error" class="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl">
      <p class="text-red-600 text-sm text-center">{{ authStore.error }}</p>
    </div>

    <form @submit="submitForm" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.firstName') }}</label>
        <input
          @blur="validateFirstName"
          v-model="form.firstName"
          type="text"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          :placeholder="$t('auth.register.yourFirstName')"
        />
        <p v-if="errors.firstName" class="mt-1 text-sm text-red-500">{{ t(errors.firstName) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.lastName') }}</label>
        <input
          @blur="validateLastName"
          v-model="form.lastName"
          type="text"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          :placeholder="$t('auth.register.yourLastName')"
        />
        <p v-if="errors.lastName" class="mt-1 text-sm text-red-500">{{ t(errors.lastName) }}</p>
      </div>

      <!-- Major select — loaded dynamically from API -->
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.department') }}</label>
        <select
          v-model="form.major_id"
          @blur="validateMajor"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          :class="form.major_id === '' ? 'text-gray-400' : 'text-gray-900'"
        >
          <option disabled value="">{{ t('auth.register.chooseDepartment') }}</option>
          <option
            v-for="major in selectableMajors"
            :key="major.id"
            :value="major.id"
          >
            {{ major.acronym }}
          </option>
        </select>
        <p v-if="errors.major_id" class="mt-1 text-sm text-red-500">{{ t(errors.major_id) }}</p>
      </div>

      <!-- Academic year — range depends on the chosen department -->
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.year') }}</label>
        <select
          v-model="form.year_level"
          @blur="validateYear"
          :disabled="!form.major_id"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#008CB9] disabled:bg-gray-100 disabled:cursor-not-allowed"
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
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.email') }}</label>
        <input
          @blur="validateEmail"
          v-model="form.email"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          placeholder="e20220886@itc.edu.kh"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-500">{{ t(errors.email) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.password') }}</label>
        <input
          @blur="validatePassword"
          v-model="form.password"
          type="password"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          :placeholder="t('auth.register.enterPassword')"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-500">{{ t(errors.password) }}</p>
      </div>

      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.confirmPassword') }}</label>
        <input
          @blur="validateConfirmPassword"
          v-model="form.confirmPassword"
          type="password"
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9]"
          :placeholder="t('auth.register.enterConfirmPassword')"
        />
        <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-500">
          {{ t(errors.confirmPassword) }}
        </p>
      </div>

      <div class="md:col-span-2 mt-2">
        <button
          class="w-full bg-[#008CB9] text-white py-3 rounded-xl font-semibold hover:bg-[#00749b] active:scale-[0.99] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          :disabled="authStore.loading"
        >
          <!-- Loading spinner while waiting for server -->
          <span v-if="authStore.loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ t('auth.register.register') }}...
          </span>
          <span v-else>{{ t('auth.register.register') }}</span>
        </button>
      </div>
    </form>

    <div class="flex justify-center gap-2 mt-6 text-sm text-gray-600">
      <span>{{ t('auth.register.haveAccount') }}</span>
      <RouterLink to="/auth/login" class="font-semibold text-[#008CB9] hover:underline">
        {{ t('auth.register.login') }}
      </RouterLink>
    </div>
  </div>
</template>