<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'Database',
  },
  img: {
    type: String,
    default: '/src/assets/images/no-image.png',
  },
})
</script>

<template>
  <div class="w-70 h-auto rounded-xl cursor-pointer">
    <div class="overflow-hidden h-48 rounded-lg border border-[#D9D9D9] bg-white">
      <div class="flex h-full w-full items-center justify-center p-3">
        <img :src="img" alt="Subject" class="block max-h-full max-w-full object-contain" />
      </div>
    </div>

    <h2 class="mt-3 text-center text-2xl font-normal leading-tight text-black">
      {{ title }}
    </h2>
  </div>
</template>
