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
      'w-full max-w-70 mx-auto md:mx-0 bg-white rounded-2xl overflow-hidden flex flex-col transition-colors',
      highlight ? 'ring-1 ring-[#008CB9]/10' : '',
    ]"
  >
    <div class="h-56 bg-white p-3">
      <img :src="coverUrl || noImage" class="h-full w-full object-contain" />
    </div>
    <div class="flex flex-1 flex-col gap-2 p-4">
      <slot />
    </div>
  </div>
</template>
