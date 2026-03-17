<script lang="ts" setup>
import { reactive } from 'vue'
import {RouterLink } from 'vue-router'

// Define the structure of the form
interface Form {
  email: string
  password: string
}

interface Errors {
  email: string
  password: string
}

// Reactive state
const form = reactive<Form>({
  email: '',
  password: '',
})

const errors = reactive<Errors>({
  email: '',
  password: '',
})

// Validation functions
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.email) {
    errors.email = 'សូមបញ្ចូលអ៊ីមែល'
  } else if (!emailRegex.test(form.email)) {
    errors.email = 'អ៊ីមែលមិនត្រឹមត្រូវ'
  } else {
    errors.email = ''
  }
}

const validatePassword = () => {
  if (!form.password) {
    errors.password = 'សូមបញ្ចូលពាក្យសម្ងាត់'
  } else if (form.password.length < 8) {
    errors.password = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ'
  } else {
    errors.password = ''
  }
}

// Submit handler
const submitForm = (e: Event) => {
  e.preventDefault()
  validateEmail()
  validatePassword()

  // Check if there are no errors
  const hasErrors = Object.values(errors).some((error) => error)
  if (!hasErrors) {
    alert('Form submitted!')
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div class="md:w-130 w-80 h-fit bg-white border-2 border-[#D9D9D9] rounded-[20px] px-8">
      <h1 class="text-[36px] font-bold flex justify-center mt-3">ចូលគណនី</h1>
      <form @submit="submitForm" class="mt-2 mb-5 flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label for="email">អ៊ីមែល</label>
          <input
            @blur="validateEmail"
            id="email"
            name="email"
            placeholder="បញ្ចូលអ៊ីមែលរបស់អ្នក"
            v-model="form.email"
            class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#1B68FF]"
          />
          <p class="text-red-500 text-sm">{{ errors.email }}</p>
        </div>

        <div class="flex flex-col gap-2">
          <label for="password">ពាក្យសម្ងាត់</label>
          <input
            @blur="validatePassword"
            type="password"
            id="password"
            name="password"
            placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
            v-model="form.password"
            class="border-2 border-[#D9D9D9] rounded-[10px] p-2 focus:outline-none focus:ring-2 focus:ring-[#1B68FF]"
          />
          <div class="flex justify-between">
            <p class="text-red-500 text-sm">{{ errors.password }}</p>
            <span class="text-[#1570EF] flex justify-end">ភ្លេចពាក្យសម្ងាត់</span>
          </div>
        </div>
        <button
          type="submit"
          class="w-full h-13 text-white rounded-lg bg-[#1B68FF] cursor-pointer hover:bg-[#093ABE] transition font-semibold"
        >
          ចូលគណនី
        </button>

        <div class="flex items-center">
          <hr class="grow border-t border-gray-300" />
          <span class="mx-4 text-gray-500">ឬ</span>
          <hr class="grow border-t border-gray-300" />
        </div>

        <button
          type="button"
          class="w-full h-13 text-[#1B68FF] rounded-lg bg-[#D1E9FF] hover:bg-[#9ccfff] flex items-center justify-center gap-2 cursor-pointer"
        >
          <img src="/src/assets/images/google.png" alt="" width="25" height="25" />
          <p>ភ្ជាប់ជាមួយ Google</p>
        </button>

        <div class="flex justify-center gap-2">
          <span class="text-[#98A2B3]">មិនទាន់មានគណនី?</span>
          <RouterLink to="/auth/register" class="text-[#1570EF]">ចុះឈ្មោះ</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>
