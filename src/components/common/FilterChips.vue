<script setup lang="ts">
// Row of pill buttons for picking a single value (e.g. doc-type filter).
// Controlled via v-model.
type ChipOption = { label: string; value: string }

defineProps<{
  modelValue: string
  options: ChipOption[]
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex items-center gap-1.5 flex-wrap">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      @click="$emit('update:modelValue', option.value)"
      :class="[
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
        modelValue === option.value
          ? 'bg-[#008CB9] text-white border-[#008CB9]'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>
