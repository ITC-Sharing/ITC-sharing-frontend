<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Form {
  firstName: string
  lastName: string
  skill: string
  email: string
  password: string
  confirmPassword: string
}

interface Errors {
  firstName: string
  lastName: string
  skill: string
  email: string
  password: string
  confirmPassword: string
}

const form = reactive<Form>({
  firstName: '',
  lastName: '',
  skill: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive<Errors>({
  firstName: '',
  lastName: '',
  skill: '',
  email: '',
  password: '',
  confirmPassword: '',
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

function validateSkill() {
  if (!form.skill || form.skill === 'ជ្រើសរើស') {
    errors.skill = 'auth.register.enterMajor'
  } else {
    errors.skill = ''
  }
}

function submitForm(e: Event) {
  e.preventDefault()

  validateFirstName()
  validateLastName()
  validateEmail()
  validatePassword()
  validateConfirmPassword()
  validateSkill()

  const hasError = Object.values(errors).some((error) => error !== '')

  if (!hasError) {
    alert('Form submitted!')
  }
}
</script>

<template>
  <div class="md:w-180 w-80 h-fit bg-white border-2 border-[#D9D9D9] rounded-[20px] px-8 py-6">
    <h1 class="text-[36px] font-bold flex justify-center items-center mb-3">{{ t('auth.register.register') }}</h1>

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

      <div>
        <label>{{ t('auth.register.major') }}</label>
        <select
          v-model="form.skill"
          required
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="form.skill === '' ? 'text-gray-400' : 'text-black'"
          @blur="validateSkill"
        >
          <option disabled value="">{{ t('auth.register.chooseMajor') }}</option>
          <option value="GIC">GIC</option>
          <option value="AMS">AMS</option>
          <option value="GTR">GTR</option>
          <option value="GCA">GCA</option>
          <option value="GCI">GCI</option>
          <option value="GAR">GAR</option>
          <option value="GTI">GTI</option>
          <option value="GIM">GIM</option>
          <option value="GEE">GEE</option>
          <option value="GUR">GRU</option>
          <option value="GUR">GGG</option>
        </select>
        <p class="text-red-500 text-sm">{{ errors.skill ? t(errors.skill) : '' }}</p>
      </div>

      <div>
        <label>{{ t('auth.register.email') }}</label>
        <input
          @blur="validateEmail"
          v-model="form.email"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('auth.register.enterEmail')"
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
        <p class="text-red-500 text-sm">{{ errors.confirmPassword ? t(errors.confirmPassword) : '' }}</p>
      </div>

      <div class="md:col-span-2">
        <button
          class="w-full bg-[#1B68FF] text-white py-3 rounded-lg font-semibold hover:bg-[#093ABE] transition cursor-pointer"
          type="submit"
        >
          {{ t('auth.register.register') }}
        </button>
      </div>
    </form>
    <div class="flex items-center my-3">
      <hr class="grow border-t border-gray-300" />
      <span class="mx-4 text-gray-500">{{ t('auth.login.or') }}</span>
      <hr class="grow border-t border-gray-300" />
    </div>
    <button
      type="button"
      class="w-full h-13 border-2 border-[#D1E9FF] text-[#1B68FF] rounded-lg bg-[#D1E9FF] hover:bg-[#9ccfff] hover:border-[#9ccfff] flex items-center justify-center gap-2 cursor-pointer"
    >
      <img src="/src/assets/images/google.png" alt="" width="25" height="25" />
      <p>{{ t('auth.login.conectWith') }} Google</p>
    </button>
    <div class="flex justify-center gap-2 mt-5">
      <span>{{ t('auth.register.haveAccount') }}</span>
      <RouterLink to="/auth/login" class="text-[#1B68FF] ml-2">{{ t('auth.register.login') }}</RouterLink>
    </div>
  </div>
</template>
