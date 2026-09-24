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
      // Same border as BookCard on the public grid, so a book looks like a book
      // wherever it appears. hover:border-primary was already being passed in by
      // the clickable grids, but with no border to change it did nothing.
      'relative w-full max-w-60 mx-auto md:mx-0 bg-white rounded-2xl overflow-hidden flex flex-col border border-[#E0E0E0] hover:border-primary transition-colors',
      highlight ? 'ring-1 ring-primary/10' : '',
    ]"
  >
    <!-- Optional overlay slot, pinned to the cover's top-right. The card is
         overflow-hidden, but RowActionsMenu teleports its dropdown to <body>,
         so the menu itself is never clipped. -->
    <div v-if="$slots.actions" class="absolute top-3 right-3 z-10" @click.stop>
      <slot name="actions" />
    </div>

    <div class="h-56 bg-white p-3">
      <img :src="coverUrl || noImage" class="h-full w-full object-contain" />
    </div>
    <hr class="border-gray-200" />
    <div class="flex flex-1 flex-col gap-2 p-4">
      <slot />
    </div>
  </div>
</template>
