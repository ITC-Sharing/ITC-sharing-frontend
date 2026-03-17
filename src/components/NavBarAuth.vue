<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between py-4">
        <!-- Logo -->
        <router-link to="/" class="text-xl font-bold">Logo</router-link>

        <!-- language -->
        <div class="flex items-center gap-4">
          <img src="/src/assets/images/english.png" class="w-8 h-8 cursor-pointer" alt="English" />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
// import { ref } from 'vue'
// import ButtonPrimary from '@/components/ButtonPrimary.vue'

// const isOpen = ref(false)

// const toggleMenu = () => {
//   isOpen.value = !isOpen.value
// }
</script>
