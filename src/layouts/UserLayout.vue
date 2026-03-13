<template>
  <div>
    <NavBar />
    <main>
      <RouterView />
    </main>
  </div>
</template>
<script setup lang="ts">
import NavBar from '@/components/NavBar.vue'
import { RouterView } from 'vue-router'
</script>
