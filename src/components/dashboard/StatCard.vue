<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  iconBg: string
  iconColor: string
}>()
</script>

<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
    <div :class="['h-11 w-11 rounded-xl flex items-center justify-center shrink-0', iconBg]">
      <svg :class="['h-5 w-5', iconColor]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <slot name="icon" />
      </svg>
    </div>
    <div>
      <p class="text-2xl font-bold text-gray-900 leading-none">{{ value }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ label }}</p>
    </div>
  </div>
</template>
