<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'search', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (newValue: string) => emit('update:modelValue', newValue),
})

const handleSubmit = () => {
  if (props.disabled) return
  emit('search', value.value)
}

const clearSearch = () => {
  value.value = ''
  emit('search', '')
}
</script>

<template>
  <form
    class="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-0.5 shadow-sm transition focus-within:border-[#008CB9] focus-within:shadow-md"
    @submit.prevent="handleSubmit"
  >
    <input
      v-model="value"
      type="text"
      :placeholder="t('common.nav.search')"
      :disabled="disabled"
      class="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
    />

    <button
      v-if="value"
      type="button"
      :disabled="disabled"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Clear"
      @click="clearSearch"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="h-5 w-5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>

    <button
      v-else
      type="submit"
      :disabled="disabled"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Search"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="h-5 w-5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35" />
        <circle cx="11" cy="11" r="6.5" />
      </svg>
    </button>
  </form>
</template>
