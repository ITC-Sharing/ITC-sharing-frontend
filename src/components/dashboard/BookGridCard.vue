<script setup lang="ts">
import noImage from '@/assets/images/no-image.png'

defineProps<{
  coverUrl?: string | null
  highlight?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'w-full max-w-70 mx-auto md:mx-0 bg-white rounded-2xl border overflow-hidden flex flex-col transition-colors',
      highlight ? 'border-[#008CB9]/30 ring-1 ring-[#008CB9]/10' : 'border-gray-100',
    ]"
  >
    <img :src="coverUrl || noImage" class="h-40 w-full object-cover" />
    <div class="flex flex-1 flex-col gap-2 p-4">
      <slot />
    </div>
  </div>
</template>
