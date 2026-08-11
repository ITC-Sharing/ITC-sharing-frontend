<script setup lang="ts">
import ToastHost from '@/components/common/ToastHost.vue'
</script>

<template>
  <RouterView />
  <!-- Rendered once here so a toast outlives the view or modal that raised it. -->
  <ToastHost />
</template>

<style scoped></style>
