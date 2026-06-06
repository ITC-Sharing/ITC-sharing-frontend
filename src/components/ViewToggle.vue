<script setup lang="ts">
defineProps<{ modelValue: 'card' | 'list' }>()
defineEmits<{ 'update:modelValue': [value: 'card' | 'list'] }>()
</script>

<template>
  <div class="hidden md:flex items-center gap-1 rounded-xl border border-gray-200 p-2">
    <button
      :class="['p-1.5 rounded-lg transition-colors', modelValue === 'card' ? 'bg-[#008CB9] text-white' : 'text-gray-400 hover:text-gray-700']"
      title="Card view"
      @click="$emit('update:modelValue', 'card')"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"/>
      </svg>
    </button>
    <button
      :class="['p-1.5 rounded-lg transition-colors', modelValue === 'list' ? 'bg-[#008CB9] text-white' : 'text-gray-400 hover:text-gray-700']"
      title="List view"
      @click="$emit('update:modelValue', 'list')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>
  </div>
</template>
