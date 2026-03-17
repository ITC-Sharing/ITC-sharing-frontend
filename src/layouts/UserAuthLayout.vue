<template>
  <div>
    <NavBarAuth />
    <main class="min-h-screen flex items-center justify-center">
      <RouterView />
    </main>
  </div>
</template>
<script setup lang="ts">
import NavBarAuth from '@/components/NavBarAuth.vue';
import { RouterView } from 'vue-router'
</script>
