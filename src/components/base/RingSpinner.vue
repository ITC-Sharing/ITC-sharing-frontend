<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * A ring spinner: a faint full-circle track with a rotating arc on top. The arc
 * fades from transparent into the current colour, which is what gives it the
 * comet look — so it reads as motion even at small sizes.
 *
 * Colour comes from `currentColor`, so set it with a text utility on the
 * spinner or any parent: `<RingSpinner class="text-primary" />`.
 */
const props = withDefaults(
  defineProps<{
    /** Diameter in pixels. */
    size?: number
    /** Ring thickness in pixels, at the given size. */
    stroke?: number
    /** How much of the circle the arc covers, 0–1. */
    arc?: number
    /** Announced to screen readers; also the tooltip. */
    label?: string
  }>(),
  { size: 24, stroke: 4, arc: 0.75, label: 'Loading' },
)

// The gradient needs a document-unique id — two spinners on one page would
// otherwise share (and fight over) the same <defs> entry.
const gradientId = `spinner-gradient-${useId()}`

// Geometry is worked out in a fixed 48-unit viewBox and scaled by `size`, so
// the stroke stays visually proportional whatever the caller asks for.
const VIEW = 48
const radius = computed(() => (VIEW - (props.stroke * VIEW) / props.size) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeWidth = computed(() => (props.stroke * VIEW) / props.size)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${VIEW} ${VIEW}`"
    class="animate-spin"
    fill="none"
    role="status"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.15" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="1" />
      </linearGradient>
    </defs>

    <!-- Track -->
    <circle
      :cx="VIEW / 2"
      :cy="VIEW / 2"
      :r="radius"
      stroke="currentColor"
      stroke-opacity="0.12"
      :stroke-width="strokeWidth"
    />

    <!-- Arc -->
    <circle
      :cx="VIEW / 2"
      :cy="VIEW / 2"
      :r="radius"
      :stroke="`url(#${gradientId})`"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="circumference * (1 - arc)"
    />
  </svg>
</template>
