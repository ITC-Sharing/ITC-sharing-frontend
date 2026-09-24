<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  /** Small line under the number, e.g. "Total uploads". */
  sublabel?: string
}>()
</script>

<template>
  <!-- Label above the number: the eye lands on the figure, and the cards read
       as a row of numbers. -->
  <div
    class="flex w-44 shrink-0 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 transition-colors sm:w-auto"
  >
    <p class="text-md text-black">{{ label }}</p>
    <p class="mt-3 text-4xl font-semibold leading-none text-gray-900">{{ value }}</p>
    <p v-if="sublabel" class="mt-2 text-xs text-gray-400">{{ sublabel }}</p>
  </div>
</template>
