<script setup lang="ts">
/**
 * The dashboard's search box: magnifier, rounded field, primary focus ring.
 *
 *   <SearchDashboard v-model="docSearch" placeholder="Search documents..." />
 */
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** Tailwind width class — lists in tighter headers use a narrower box. */
    width?: string
  }>(),
  { placeholder: 'Search...', width: 'w-56' },
)

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="relative">
    <svg
      class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :class="[
        width,
        'rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
