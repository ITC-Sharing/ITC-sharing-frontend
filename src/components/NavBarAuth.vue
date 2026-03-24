<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between py-4">
        
        <!-- Logo -->
        <router-link to="/" class="text-xl font-bold">
          Logo
        </router-link>

        <!-- Language Toggle -->
        <div
          class="relative w-18 h-8 bg-gray-200 rounded-full flex items-center cursor-pointer"
          @click="toggleLang"
        >
          <!-- Sliding background -->
          <div
            class="absolute top-0 left-0 h-8 w-1/2 bg-[#008CB9] rounded-full transition-all duration-300"
            :class="isKm ? 'translate-x-full' : 'translate-x-0'"
          ></div>

          <!-- Labels -->
          <div class="flex w-full z-10 text-sm font-semibold">
            <div class="w-1/2 text-center"
                 :class="!isKm ? 'text-white' : 'text-gray-600'">
              EN
            </div>
            <div class="w-1/2 text-center"
                 :class="isKm ? 'text-white' : 'text-gray-600'">
              KH
            </div>
          </div>
        </div>

      </div>
    </div>
  </nav>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n({ useScope: 'global' })

// ✅ better init
const isKm = ref(locale.value === 'km')

const toggleLang = () => {
  const newLang = isKm.value ? 'en' : 'km'
  isKm.value = !isKm.value

  locale.value = newLang
  localStorage.setItem('lang', newLang)
}

watch(locale, (val) => {
  isKm.value = val === 'km'
})
</script>