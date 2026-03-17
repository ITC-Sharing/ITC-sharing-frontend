<script setup lang="ts">
import { reactive } from 'vue'

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
    errors.firstName = 'សូមបញ្ចូលនាមត្រកូល'
  } else if (!nameRegex.test(form.firstName)) {
    errors.firstName = 'មិនអាចមានលេខ ឬ សញ្ញាពិសេសបានទេ'
  } else {
    errors.firstName = ''
  }
}

function validateLastName() {
  if (!form.lastName) {
    errors.lastName = 'សូមបញ្ចូលនាមខ្លួន'
  } else if (!nameRegex.test(form.lastName)) {
    errors.lastName = 'មិនអាចមានលេខ ឬ សញ្ញាពិសេសបានទេ'
  } else {
    errors.lastName = ''
  }
}

function validateEmail() {
  if (!form.email) {
    errors.email = 'សូមបញ្ចូលអ៊ីមែល'
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'អ៊ីមែលមិនត្រឹមត្រូវ'
  } else {
    errors.email = ''
  }
}

function validatePassword() {
  if (!form.password) {
    errors.password = 'សូមបញ្ចូលពាក្យសម្ងាត់'
  } else if (form.password.length < 8) {
    errors.password = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ'
  } else {
    errors.password = ''
  }
}

function validateConfirmPassword() {
  if (!form.confirmPassword) {
    errors.confirmPassword = 'សូមបញ្ចូលបញ្ជាក់ពាក្យសម្ងាត់'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'ពាក្យសម្ងាត់មិនដូចគ្នា'
  } else {
    errors.confirmPassword = ''
  }
}

function validateSkill() {
  if (!form.skill || form.skill === 'ជ្រើសរើស') {
    errors.skill = 'សូមជ្រើសរើសជំនាញ'
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
    <h1 class="text-[36px] font-bold flex justify-center items-center mb-3">បង្កើតគណនី</h1>

    <form @submit="submitForm" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label>នាមត្រកូល</label>
        <input
          @blur="validateFirstName"
          v-model="form.firstName"
          type="text"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="នាមត្រកូលរបស់អ្នក"
        />
        <p class="text-red-500 text-sm">{{ errors.firstName }}</p>
      </div>

      <div>
        <label>នាមខ្លួន</label>
        <input
          @blur="validateLastName"
          v-model="form.lastName"
          type="text"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="នាមខ្លួនរបស់អ្នក"
        />
        <p class="text-red-500 text-sm">{{ errors.lastName }}</p>
      </div>

      <div>
        <label>ជំនាញ</label>
        <select
          v-model="form.skill"
          required
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="form.skill === '' ? 'text-gray-400' : 'text-black'"
          @blur="validateSkill"
        >
          <option disabled value="">ជ្រើសរើស</option>
          <option value="GIC">GIC</option>
          <option value="AMS">AMS</option>
          <option value="GTR">GTR</option>
          <option value="GCA">GCA</option>
          <option value="GCI">GCI</option>
          <option value="GAR">GAR</option>
          <option value="GTI">GTI</option>
          <option value="GIM">GIM</option>
          <option value="GEE">GEE</option>
          <option value="GUR">GUR</option>
        </select>
        <p class="text-red-500 text-sm">{{ errors.skill }}</p>
      </div>

      <div>
        <label>អ៊ីមែល</label>
        <input
          @blur="validateEmail"
          v-model="form.email"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក"
        />
        <p class="text-red-500 text-sm">{{ errors.email }}</p>
      </div>

      <div>
        <label>ពាក្យសម្ងាត់</label>
        <input
          @blur="validatePassword"
          v-model="form.password"
          type="password"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
        />
        <p class="text-red-500 text-sm">{{ errors.password }}</p>
      </div>

      <div>
        <label>បញ្ជាក់ពាក្យសម្ងាត់</label>
        <input
          @blur="validateConfirmPassword"
          v-model="form.confirmPassword"
          type="password"
          class="w-full border-2 border-[#D9D9D9] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
        />
        <p class="text-red-500 text-sm">{{ errors.confirmPassword }}</p>
      </div>

      <div class="md:col-span-2">
        <button
          class="w-full bg-[#1B68FF] text-white py-3 rounded-lg font-semibold hover:bg-[#093ABE] transition cursor-pointer"
          type="submit"
        >
          ចុះឈ្មោះ
        </button>
      </div>
    </form>
    <div class="flex items-center my-3">
      <hr class="grow border-t border-gray-300" />
      <span class="mx-4 text-gray-500">ឬ</span>
      <hr class="grow border-t border-gray-300" />
    </div>
    <button
      type="button"
      class="w-full h-13 border-2 border-[#D1E9FF] text-[#1B68FF] rounded-lg bg-[#D1E9FF] hover:bg-[#9ccfff] hover:border-[#9ccfff] flex items-center justify-center gap-2 cursor-pointer"
    >
      <img src="/src/assets/images/google.png" alt="" width="25" height="25" />
      <p>ភ្ជាប់ជាមួយ Google</p>
    </button>
    <div class="flex justify-center gap-2 mt-5">
      <span>មានគណនីរួចហើយ?</span>
      <RouterLink to="/auth/login" class="text-[#1B68FF] ml-2">ចូលគណនី</RouterLink>
    </div>
  </div>
</template>
