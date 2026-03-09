<template>
  <nav class="bg-white shadow-sm fixed top-0 left-0 w-full z-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Left Section -->
        <div class="flex items-center gap-4">
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
        <router-link to="/" class="md:hidden text-xl font-bold">Logo</router-link>

        <!-- Desktop Menu -->
        <ul class="hidden md:flex gap-8 font-semibold text-black text-lg">
          <router-link to="/" class="hover:text-[#008CB9]">ទំព័រដើម</router-link>
          <router-link to="/documents" class="hover:text-[#008CB9]">ឯកសារ</router-link>
          <router-link to="/books" class="hover:text-[#008CB9]">សៀវភៅ</router-link>
        </ul>

        <!-- Right Section -->
        <div class="flex items-center gap-4">
          <img src="https://flagcdn.com/w40/gb.png" class="w-7 h-7 cursor-pointer" alt="English" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6 md:hidden w-8 h-8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>

          <ButtonPrimary text="ចូលគណនី" class="hidden md:block" />
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
