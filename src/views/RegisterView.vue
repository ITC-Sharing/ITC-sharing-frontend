<script setup lang="ts">
import { reactive, onMounted } from 'vue'
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
  email: string
  password: string
  confirmPassword: string
}

interface Errors {
  firstName: string
  lastName: string
  major_id: string   // ← was "skill"
  email: string
  password: string
  confirmPassword: string
}

const form = reactive<Form>({
  firstName: '',
  lastName: '',
  major_id: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive<Errors>({
  firstName: '',
  lastName: '',
  major_id: '',
  email: '',
  password: '',
  confirmPassword: '',
})

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

async function submitForm(e: Event) {
  e.preventDefault()

  validateFirstName()
  validateLastName()
  validateEmail()
  validatePassword()
  validateConfirmPassword()
  validateMajor()

  const hasError = Object.values(errors).some((error) => error !== '')
  if (hasError) return

  try {
    await authStore.register({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      password: form.password,
      major_id: form.major_id,
    })

    // Success — go to login
    router.push('/auth/login')

  } catch {
    // authStore.error is already set, shown in template below
  }
}
</script>

<template>
  <div class="md:w-180 w-80 h-fit bg-white border-2 border-[#D9D9D9] rounded-[20px] px-8 py-6">
    <h1 class="text-[36px] font-bold flex justify-center items-center mb-3">
      {{ t('auth.register.register') }}
    </h1>

    <!-- Server error banner -->
    <div v-if="authStore.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-600 text-sm text-center">{{ authStore.error }}</p>
    </div>

    <form @submit="submitForm" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label>{{ t('auth.register.firstName') }}</label>
        <input
          @blur="validateFirstName"
          v-model="form.firstName"
          type="text"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('auth.register.yourFirstName')"
        />
        <p class="text-red-500 text-sm">{{ errors.firstName ? t(errors.firstName) : '' }}</p>
      </div>

      <div>
        <label>{{ t('auth.register.lastName') }}</label>
        <input
          @blur="validateLastName"
          v-model="form.lastName"
          type="text"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="$t('auth.register.yourLastName')"
        />
        <p class="text-red-500 text-sm">{{ errors.lastName ? t(errors.lastName) : '' }}</p>
      </div>

      <!-- Major select — loaded dynamically from API -->
      <div>
        <label>{{ t('auth.register.department') }}</label>
        <select
          v-model="form.major_id"
          @blur="validateMajor"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="form.major_id === '' ? 'text-gray-400' : 'text-black'"
        >
          <option disabled value="">{{ t('auth.register.chooseDepartment') }}</option>
          <option
            v-for="major in majorsStore.majors"
            :key="major.id"
            :value="major.id"
          >
            {{ major.acronym }}
          </option>
        </select>
        <p class="text-red-500 text-sm">{{ errors.major_id ? t(errors.major_id) : '' }}</p>
      </div>

      <div>
        <label>{{ t('auth.register.email') }}</label>
        <input
          @blur="validateEmail"
          v-model="form.email"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e20220886@itc.edu.kh"
        />
        <p class="text-red-500 text-sm">{{ errors.email ? t(errors.email) : '' }}</p>
      </div>

      <div>
        <label>{{ t('auth.register.password') }}</label>
        <input
          @blur="validatePassword"
          v-model="form.password"
          type="password"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('auth.register.enterPassword')"
        />
        <p class="text-red-500 text-sm">{{ errors.password ? t(errors.password) : '' }}</p>
      </div>

      <div>
        <label>{{ t('auth.register.confirmPassword') }}</label>
        <input
          @blur="validateConfirmPassword"
          v-model="form.confirmPassword"
          type="password"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('auth.register.enterConfirmPassword')"
        />
        <p class="text-red-500 text-sm">
          {{ errors.confirmPassword ? t(errors.confirmPassword) : '' }}
        </p>
      </div>

      <div class="md:col-span-2">
        <button
          class="w-full bg-[#1B68FF] text-white py-3 rounded-lg font-semibold hover:bg-[#093ABE] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

    <div class="flex justify-center gap-2 mt-5">
      <span>{{ t('auth.register.haveAccount') }}</span>
      <RouterLink to="/auth/login" class="text-[#1B68FF] ml-2">
        {{ t('auth.register.login') }}
      </RouterLink>
    </div>
  </div>
</template>