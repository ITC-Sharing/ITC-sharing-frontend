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
          <router-link to="/" class="hover:text-[#008CB9]">ទំព័រដើម</router-link>
          <router-link to="/documents" class="hover:text-[#008CB9]">ឯកសារ</router-link>
          <router-link to="/books" class="hover:text-[#008CB9]">សៀវភៅ</router-link>
        </ul>

        <!-- Right Section -->
        <div class="flex items-center">
          <img
            src="/src/assets/images/english.png"
            class="md:w-8 md:h-8 w-7 h-7 cursor-pointer mr-4 md:gap-4"
            alt="English"
          />
          <RouterLink to="/auth/login">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="w-8 h-8 md:hidden">
              <path
                d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"
              />
            </svg>
          </RouterLink>

          <RouterLink to="/auth/login">
            <ButtonPrimary text="ចូលគណនី" class="hidden md:block" />
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-if="isOpen" class="md:hidden px-6 pb-4">
      <ul class="flex flex-col gap-4 font-semibold text-gray-800">
        <router-link to="/">ទំព័រដើម</router-link>
        <router-link to="/documents">ឯកសារ</router-link>
        <router-link to="/books">សៀវភៅ</router-link>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ButtonPrimary from '@/components/ButtonPrimary.vue'

const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}
</script>
