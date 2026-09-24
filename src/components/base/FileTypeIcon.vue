<script setup lang="ts">
import { computed } from 'vue'
import { fileTypeStyle } from '@/utils/format'

/**
 * The square that stands in for a file, coloured by its type — PDF red, Word
 * blue, PowerPoint orange, images green, archives yellow, spreadsheets teal.
 *
 *   solid — filled square with a white PDF/DOC/… label (file lists, rows)
 *   soft  — tinted square with a document glyph (upload cards)
 *
 * `<FileTypeIcon :name="file.original_name" />`
 */
const props = withDefaults(
  defineProps<{
    /** File name — only its extension matters. */
    name?: string | null
    variant?: 'solid' | 'soft'
    /** Box size in pixels. */
    size?: number
    /** Corner rounding — a Tailwind class, so big tiles can be softer. */
    rounded?: string
    /** Show the short type label under the glyph (soft variant only). */
    withLabel?: boolean
  }>(),
  { name: '', variant: 'solid', size: 32, rounded: 'rounded-lg', withLabel: false },
)

const style = computed(() => fileTypeStyle(props.name))
// The label has to shrink with the box or it spills out of the small sizes.
const labelSize = computed(() =>
  Math.max(8, Math.round(props.size * (props.withLabel ? 0.17 : 0.3))),
)
</script>

<template>
  <div
    class="flex shrink-0 flex-col items-center justify-center gap-0.5 font-bold hover:cursor-pointer"
    :class="[rounded, variant === 'solid' ? `${style.solid} text-white` : style.soft]"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <span v-if="variant === 'solid'" :style="{ fontSize: `${labelSize}px` }">
      {{ style.label }}
    </span>
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      :style="{
        width: `${size * (withLabel ? 0.4 : 0.5)}px`,
        height: `${size * (withLabel ? 0.4 : 0.5)}px`,
      }"
    >
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="variant === 'soft' && withLabel" :style="{ fontSize: `${labelSize}px` }">
      {{ style.label }}
    </span>
  </div>
</template>
